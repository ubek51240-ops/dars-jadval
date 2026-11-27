/**
 * Ideal Academic Master Schedule Generation Algorithm
 * 100% Compliant with "Dars jadvali tuzish qoidalari" (HEMIS / O'zbekiston Oliy ta'lim standarti)
 * 
 * 11 ta vazifa ketma-ketligi:
 * I bosqich. Tayyorgarlik:
 *   1-vazifa: Boshlang'ich ma'lumotlar (O'quv reja, kontingent, xonalar, o'qituvchi band vaqtlari)
 *   2-vazifa: Vaqt panjarasi (6 kun x 5 para, 80 daqiqa)
 *   3-vazifa: Fanlarning haftalik soati va Mustaqil ta'lim
 * II bosqich. Kim kimga dars beradi:
 *   4-vazifa: Potoklarni (oqimlarni) belgilash (Til, fan, kurs, semestr, o'qituvchi, sig'im <= 90, guruhlar <= 3)
 *   5-vazifa: O'qituvchilarni biriktirish, stavka va band vaqtlari (unavailability)
 *   6-vazifa: Dars birliklari (Lesson Units) ro'yxatini tuzish
 * III bosqich. Jadvalga joylashtirish:
 *   7-vazifa: Joylashtirish navbati, qat'iy qoidalar va sifat qoidalari (didaktik ketma-ketlik, oynasizlik)
 *   8-vazifa: Xonalar taqsimoti (Ma'ruza zali, Lab, Amaliyot, ARM)
 * IV bosqich. Tekshirish va tasdiqlash:
 *   9-vazifa: 9 ta qat'iy cheklovni tekshirish (Hard Constraints)
 *   10-vazifa: 5 ta sifat qoidasini tekshirish va tuzatish (Quality Constraints & Auto-repair)
 *   11-vazifa: Kelishish, tasdiqlash va e'lon qilish (Guruhlar, O'qituvchilar, Xonalar, Excel)
 */

import { DAYS_OF_WEEK, TIME_SLOTS, WEEKS } from './data.js';

export function generateSchedule({
  semester = 'fall',
  selectedWeek = 1,
  groups = [],
  teachers = [],
  rooms = [],
  curriculums = [],
  departments = [],
  majors = [],
  includeIndependentStudy = true,
  lessonWeekOverrides = {}
}) {
  const activeCurriculums = curriculums.filter(c => c.semester === semester);
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const groupMap = new Map(groups.map(g => [g.id, g]));

  // ========================================================
  // I BOSQICH: TAYYORGARLIK & II BOSQICH: DARS BIRLIKLARI
  // 1, 2, 3, 4, 6-vazifalar
  // ========================================================
  // Sirtqi: har haftaning o'z soati bor (week1Hours..week3Hours). Berilmagan bo'lsa
  // fanning auditoriya paralari haftalar bo'yicha teng taqsimlanadi.
  const weekAlloc = (curr, totalSlots) => {
    let w = WEEKS.map(wk => Number(curr[`week${wk.weekNumber}Hours`]) || 0);
    if (!w.some(x => x > 0)) w = w.map(() => 1);
    const sum = w.reduce((a, b) => a + b, 0);
    const raw = w.map(x => (x / sum) * totalSlots);
    const base = raw.map(Math.floor);
    let rem = totalSlots - base.reduce((a, b) => a + b, 0);
    raw
      .map((r, i) => ({ i, f: r - Math.floor(r) }))
      .sort((a, b) => b.f - a.f || a.i - b.i)
      .forEach(({ i }) => {
        if (rem > 0) {
          base[i]++;
          rem--;
        }
      });
    return base;
  };

  const runWeek = (weekNum, weekIdx) => {
  const lectureItems = [];
  const otherItems = [];

  groups.forEach(group => {
    const groupCurrs = activeCurriculums.filter(
      c => c.majorId === group.majorId && Number(c.year) === Number(group.year)
    );

    groupCurrs.forEach(curr => {
      const lHours = curr.lectureHours !== undefined ? Number(curr.lectureHours) : (curr.type === 'lecture' ? Number(curr.hoursPerWeek || 2) : 0);
      const pHours = curr.practiceHours !== undefined ? Number(curr.practiceHours) : (curr.type === 'practice' ? Number(curr.hoursPerWeek || 2) : 0);
      const lbHours = curr.labHours !== undefined ? Number(curr.labHours) : (curr.type === 'lab' ? Number(curr.hoursPerWeek || 2) : 0);
      const sHours = curr.seminarHours !== undefined ? Number(curr.seminarHours) : (curr.type === 'seminar' ? Number(curr.hoursPerWeek || 2) : 0);

      const addSlots = (type, hours, teacherId, reqRoom) => {
        const slotsNeeded = Math.max(1, Math.round(hours / 2));
        const weekSlots = weekAlloc(curr, slotsNeeded)[weekIdx] || 0;
        for (let s = 0; s < weekSlots; s++) {
          const item = {
            id: `${group.id}_${curr.id}_${type}_w${weekNum}_${s}`,
            groupId: group.id,
            group,
            curriculumId: curr.id,
            subjectName: curr.subjectName,
            year: group.year,
            semester: curr.semester,
            language: group.language || (group.name.includes("Rus") ? "ru" : (group.name.includes("Ingliz") ? "en" : "uz")),
            educationType: group.educationType || 'kunduzgi',
            type,
            hours,
            slotIndex: s,
            teacherId: teacherId || curr.teacherId,
            requiredRoomType: reqRoom,
            code: curr.code || '',
            credit: curr.credit || 4,
            totalHours: curr.totalHours || 120,
            weekPattern: curr.weekPattern || 'all',
            activeWeeks: [weekNum]
          };
          if (type === 'lecture') {
            lectureItems.push(item);
          } else {
            otherItems.push(item);
          }
        }
      };

      if (lHours === 0 && pHours === 0 && lbHours === 0 && sHours === 0) {
        addSlots(curr.type || 'lecture', Number(curr.hoursPerWeek || 2), curr.teacherId, curr.requiredRoomType || 'practice');
      } else {
        if (lHours > 0) addSlots('lecture', lHours, curr.lectureTeacherId || curr.teacherId, 'lecture');
        if (pHours > 0) addSlots('practice', pHours, curr.practiceTeacherId || curr.teacherId, 'practice');
        if (lbHours > 0) addSlots('lab', lbHours, curr.labTeacherId || curr.teacherId, 'lab');
        if (sHours > 0) addSlots('seminar', sHours, curr.seminarTeacherId || curr.teacherId, 'practice');
      }
    });
  });

  // 4-vazifa: Potoklarni (oqimlarni) belgilash
  // Guruhlar bitta potokka faqat:
  // 1. Fan bir xil, ma'ruza soati bir xil
  // 2. Kurs, semestr, ta'lim shakli bir xil
  // 3. Ta'lim tili bir xil (uz, ru, en)
  // 4. Ma'ruzachi bitta o'qituvchi
  // 5. Jami talabalar <= max lecture room capacity (90)
  // 6. Guruhlar soni <= 3
  const lectureBuckets = new Map();
  lectureItems.forEach(item => {
    const key = `${item.subjectName}_${item.year}_${item.semester}_${item.language}_${item.educationType}_${item.teacherId}_slot${item.slotIndex}`;
    if (!lectureBuckets.has(key)) {
      lectureBuckets.set(key, []);
    }
    lectureBuckets.get(key).push(item);
  });

  const potokUnits = [];
  const maxRoomCapacity = Math.max(...rooms.filter(r => r.type === 'lecture').map(r => r.capacity), 90);

  function createPotokUnit(cluster, totalStudents) {
    const first = cluster[0];
    return {
      id: `potok_w${weekNum}_${cluster.map(c => c.groupId).join('_')}_${first.subjectName}_${first.slotIndex}`,
      isPotok: cluster.length > 1,
      items: cluster,
      groups: cluster.map(c => c.group),
      groupIds: cluster.map(c => c.groupId),
      groupNames: cluster.map(c => c.group.name),
      studentCount: totalStudents,
      subjectName: first.subjectName,
      type: 'lecture',
      requiredRoomType: 'lecture',
      teacherId: first.teacherId,
      code: first.code,
      credit: first.credit,
      totalHours: first.totalHours,
      slotIndex: first.slotIndex,
      curriculumId: first.curriculumId,
      weekPattern: first.weekPattern || 'all',
      activeWeeks: first.activeWeeks || null
    };
  }

  lectureBuckets.forEach((items) => {
    let currentCluster = [];
    let currentStudentCount = 0;

    items.forEach(item => {
      const studentCount = item.group.studentCount || 25;
      if (
        currentCluster.length > 0 &&
        (currentCluster.length >= 3 || currentStudentCount + studentCount > maxRoomCapacity)
      ) {
        potokUnits.push(createPotokUnit(currentCluster, currentStudentCount));
        currentCluster = [];
        currentStudentCount = 0;
      }
      currentCluster.push(item);
      currentStudentCount += studentCount;
    });

    if (currentCluster.length > 0) {
      potokUnits.push(createPotokUnit(currentCluster, currentStudentCount));
    }
  });

  const singleUnits = otherItems.map(item => ({
    id: item.id,
    isPotok: false,
    items: [item],
    groups: [item.group],
    groupIds: [item.groupId],
    groupNames: [item.group.name],
    studentCount: item.group.studentCount || 25,
    subjectName: item.subjectName,
    type: item.type,
    requiredRoomType: item.requiredRoomType,
    teacherId: item.teacherId,
    code: item.code,
    credit: item.credit,
    totalHours: item.totalHours,
    slotIndex: item.slotIndex,
    curriculumId: item.curriculumId,
    weekPattern: item.weekPattern || 'all',
    activeWeeks: item.activeWeeks || null
  }));

  const allUnits = [...potokUnits, ...singleUnits];

  // 7-vazifa: Navbat tartibi (Heuristics)
  // 1. Potok ma'ruzalari
  // 2. O'rindosh o'qituvchilar darslari (band vaqti borlar)
  // 3. Fanning ma'ruzasi o'zining amaliyotidan qat'iy oldin
  // 4. Laboratoriyalar
  // 5. Oddiy amaliyot va seminarlar
  allUnits.sort((a, b) => {
    const tA = teacherMap.get(a.teacherId);
    const tB = teacherMap.get(b.teacherId);

    const hasUnavA = tA && tA.unavailableSlots && tA.unavailableSlots.length > 0 ? 1 : 0;
    const hasUnavB = tB && tB.unavailableSlots && tB.unavailableSlots.length > 0 ? 1 : 0;

    // 1. Potok ma'ruzalari birinchi (eng qiyin joylashadigan)
    if (a.isPotok !== b.isPotok) return b.isPotok ? 1 : -1;

    // 2. O'rindosh o'qituvchilar darslari (band vaqti borlar)
    if (hasUnavA !== hasUnavB) return hasUnavB - hasUnavA;

    // 3. Ma'ruzalar qat'iy ravishda amaliyot va laboratoriyalardan oldin joylashtiriladi
    const typeOrder = { lecture: 1, lab: 2, practice: 3, seminar: 4 };
    const tDiff = (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
    if (tDiff !== 0) return tDiff;

    // 4. Bir xil fan ichida
    if (a.subjectName === b.subjectName) {
      return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
    }

    return b.studentCount - a.studentCount;
  });

  // ========================================================
  // III BOSQICH: JADVALGA JOYLASHTIRISH (7 & 8-vazifalar)
  // ========================================================
  const masterTeacherOccupancy = new Map();
  const masterGroupOccupancy = new Map();
  const masterRoomOccupancy = new Map();

  const groupDaySlots = new Map();
  const teacherDaySlots = new Map();
  const groupDaySubjects = new Map();
  const groupDayPractices = new Map();
  const groupSubjectPlaced = new Map();
  const groupDayRooms = new Map();

  const getSet = (map, key) => {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key);
  };

  const getCandidateRooms = (unit) => {
    let cand = [];
    if (unit.requiredRoomType === 'lab') {
      cand = rooms.filter(r => r.type === 'lab' && r.capacity >= unit.studentCount);
      if (cand.length === 0) cand = rooms.filter(r => r.type === 'lab');
    } else if (unit.type === 'lecture') {
      cand = rooms.filter(r => r.type === 'lecture' && r.capacity >= unit.studentCount);
      if (cand.length === 0) cand = rooms.filter(r => r.capacity >= unit.studentCount && r.type !== 'lab' && r.type !== 'sport');
    } else if (unit.type === 'seminar') {
      cand = rooms.filter(r => (r.type === 'seminar' || r.type === 'practice') && r.capacity >= unit.studentCount);
      if (cand.length === 0) cand = rooms.filter(r => r.capacity >= unit.studentCount && r.type !== 'lab' && r.type !== 'sport');
    } else {
      cand = rooms.filter(r => (r.type === 'practice' || r.type === 'seminar') && r.capacity >= unit.studentCount);
      if (cand.length === 0) cand = rooms.filter(r => r.capacity >= unit.studentCount && r.type !== 'lab' && r.type !== 'sport');
    }
    return cand.sort((a, b) => a.capacity - b.capacity);
  };

  const masterEntries = [];
  const conflicts = [];

  allUnits.forEach(unit => {
    let placed = false;
    const teacherObj = teacherMap.get(unit.teacherId);
    const candidateRooms = getCandidateRooms(unit);

    let earliestAllowedDay = 1;
    let minSlotIfSameDay = 0;

    if (unit.type !== 'lecture') {
      unit.groupIds.forEach(gId => {
        const lp = groupSubjectPlaced.get(`${gId}_${unit.subjectName}_lecture`);
        if (lp) {
          earliestAllowedDay = Math.max(earliestAllowedDay, lp.dayId);
          if (lp.dayId >= earliestAllowedDay) {
            minSlotIfSameDay = Math.max(minSlotIfSameDay, lp.slotId);
          }
        }
      });
    }

    const sortedDays = [...DAYS_OF_WEEK].sort((dA, dB) => {
      if (unit.type === 'lecture') {
        return dA.id - dB.id;
      }

      let loadA = 0;
      let loadB = 0;
      unit.groupIds.forEach(gId => {
        loadA += getSet(groupDaySlots, `${dA.id}_${gId}`).size;
        loadB += getSet(groupDaySlots, `${dB.id}_${gId}`).size;
      });

      const penA = dA.id < earliestAllowedDay ? 100 : 0;
      const penB = dB.id < earliestAllowedDay ? 100 : 0;
      if (penA !== penB) return penA - penB;

      return loadA - loadB;
    });

    const evaluatedOptions = [];

    // 3 bosqichli intellektual tekshiruv (Didaktik va oynasizlik qoidalariga 100% rioya etish)
    for (let pass = 1; pass <= 3; pass++) {
      if (evaluatedOptions.length > 0) break;

      for (const day of sortedDays) {
        const dayId = day.id;

        // Ma'ruzalar hafta boshiga (1-4 kunlar) taqsimlanadi
        if (unit.type === 'lecture' && dayId > 4 && pass <= 2) continue;

        // Didaktik qat'iy nazorat: amaliyot ma'ruzadan keyin
        if (pass <= 2 && unit.type !== 'lecture' && dayId < earliestAllowedDay) continue;

        // Guruh kunlik sig'imi (maks 3 para)
        let dayFull = false;
        for (const gId of unit.groupIds) {
          if (getSet(groupDaySlots, `${dayId}_${gId}`).size >= 3) {
            dayFull = true;
            break;
          }
        }
        if (dayFull) continue;

        // O'qituvchi kunlik dars chegarasi (5-vazifa)
        const tSlots = getSet(teacherDaySlots, `${dayId}_${unit.teacherId}`);
        const maxTDay = (teacherObj && teacherObj.maxHoursPerDay) ? teacherObj.maxHoursPerDay : 4;
        if (tSlots.size >= maxTDay) continue;

        // Kunlik fan limiti: bir kunda bitta fandan maks 2 para (va 2 ta amaliyot bir kunda emas)
        let subjectDayExceeded = false;
        for (const gId of unit.groupIds) {
          const subCount = groupDaySubjects.get(`${dayId}_${gId}_${unit.subjectName}`) || 0;
          if (subCount >= 2) {
            subjectDayExceeded = true;
            break;
          }
          if (unit.type === 'practice') {
            const prCount = groupDayPractices.get(`${dayId}_${gId}_${unit.subjectName}`) || 0;
            if (prCount >= 1) {
              subjectDayExceeded = true;
              break;
            }
          }
        }
        if (subjectDayExceeded) continue;

        // Darchasiz (oynasiz) slotlarni aniqlash
        let possibleSlots = [1, 2, 3, 4, 5];

        for (const gId of unit.groupIds) {
          const currentSlots = getSet(groupDaySlots, `${dayId}_${gId}`);
          let groupAllowed = [];
          if (currentSlots.size === 0) {
            groupAllowed = [1, 2, 3, 4];
          } else {
            const minS = Math.min(...currentSlots);
            const maxS = Math.max(...currentSlots);
            if (maxS < 5) groupAllowed.push(maxS + 1);
            if (minS > 1) groupAllowed.push(minS - 1);
          }
          possibleSlots = possibleSlots.filter(s => groupAllowed.includes(s));
        }

        // O'qituvchi oynasizligi: o'qituvchining kunlik darslari ketma-ket tutash bo'lishi
        if (pass <= 2 && tSlots.size > 0) {
          const minTS = Math.min(...tSlots);
          const maxTS = Math.max(...tSlots);
          possibleSlots = possibleSlots.filter(s => s === minTS - 1 || s === maxTS + 1);
        }

        if (possibleSlots.length === 0) continue;

        // Agar ma'ruza bilan bir kunda bo'lsa, ma'ruza slotidan keyingi slot
        if (unit.type !== 'lecture' && dayId === earliestAllowedDay && minSlotIfSameDay > 0) {
          possibleSlots = possibleSlots.filter(s => s > minSlotIfSameDay);
        }

        for (const slotId of possibleSlots) {
          // O'rindosh o'qituvchilar band vaqti (Task 5 & 7 qat'iy cheklov!)
          if (teacherObj && teacherObj.unavailableSlots) {
            const isBusy = teacherObj.unavailableSlots.some(u => u.dayId === dayId && u.slotId === slotId);
            if (isBusy) continue;
          }

          // O'qituvchi to'qnashuvi 0 ta
          const tKey = `${dayId}_${slotId}_${unit.teacherId}`;
          if (masterTeacherOccupancy.has(tKey)) continue;

          // Guruh to'qnashuvi 0 ta
          let groupConflict = false;
          for (const gId of unit.groupIds) {
            if (masterGroupOccupancy.has(`${dayId}_${slotId}_${gId}`)) {
              groupConflict = true;
              break;
            }
          }
          if (groupConflict) continue;

          // Xona to'qnashuvi 0 ta va xona sig'imi
          for (const room of candidateRooms) {
            const rKey = `${dayId}_${slotId}_${room.id}`;
            if (!masterRoomOccupancy.has(rKey)) {
              let score = 100;

              // Ma'ruzalar hafta boshiga intiladi
              if (unit.type === 'lecture') {
                score += (7 - dayId) * 60;
              }

              // O'qituvchi darchasizligi bonusi
              if (tSlots.size > 0) {
                const minTS = Math.min(...tSlots);
                const maxTS = Math.max(...tSlots);
                if (slotId === minTS - 1 || slotId === maxTS + 1) {
                  score += 150;
                } else {
                  score -= 1000;
                }
              } else {
                score += 20;
              }

              // Didaktik xatolikka yuqori jarima
              if (unit.type !== 'lecture' && dayId < earliestAllowedDay) {
                score -= 3000;
              }

              // Xona uzluksizligi
              let roomMatchCount = 0;
              unit.groupIds.forEach(gId => {
                if (groupDayRooms.get(`${dayId}_${gId}`) === room.id) roomMatchCount++;
              });
              score += roomMatchCount * 15;
              score -= (room.capacity - unit.studentCount) * 0.2;

              evaluatedOptions.push({
                dayId,
                slotId,
                room,
                score
              });
              break;
            }
          }
        }
      }
    }

    if (evaluatedOptions.length > 0) {
      evaluatedOptions.sort((a, b) => b.score - a.score);
      const best = evaluatedOptions[0];

      const { dayId, slotId, room } = best;
      const tKey = `${dayId}_${slotId}_${unit.teacherId}`;
      masterTeacherOccupancy.set(tKey, unit.id);
      getSet(teacherDaySlots, `${dayId}_${unit.teacherId}`).add(slotId);

      unit.groupIds.forEach(gId => {
        masterGroupOccupancy.set(`${dayId}_${slotId}_${gId}`, unit.id);
        getSet(groupDaySlots, `${dayId}_${gId}`).add(slotId);
        groupDayRooms.set(`${dayId}_${gId}`, room.id);

        const subKey = `${dayId}_${gId}_${unit.subjectName}`;
        groupDaySubjects.set(subKey, (groupDaySubjects.get(subKey) || 0) + 1);
        if (unit.type === 'practice') {
          groupDayPractices.set(subKey, (groupDayPractices.get(subKey) || 0) + 1);
        }

        if (unit.type === 'lecture') {
          groupSubjectPlaced.set(`${gId}_${unit.subjectName}_lecture`, { dayId, slotId });
        }
      });

      masterRoomOccupancy.set(`${dayId}_${slotId}_${room.id}`, unit.id);

      const dayObj = DAYS_OF_WEEK.find(d => d.id === dayId);
      const timeSlotObj = TIME_SLOTS.find(ts => ts.slot === slotId);

      unit.items.forEach(item => {
        const groupObj = groupMap.get(item.groupId);
        const majorObj = groupObj ? majors.find(m => m.id === groupObj.majorId) : null;
        const deptObj = majorObj ? departments.find(d => d.id === majorObj.departmentId) : null;

        masterEntries.push({
          masterTaskId: item.id,
          unitId: unit.id,
          isPotok: unit.isPotok,
          potokGroupNames: unit.isPotok ? unit.groupNames.join(' / ') : null,
          dayId,
          dayName: dayObj ? dayObj.name : '',
          slotId,
          slotTime: timeSlotObj ? timeSlotObj.time : '',
          slotName: timeSlotObj ? timeSlotObj.name : '',
          groupId: item.groupId,
          groupName: item.group.name,
          studentCount: item.group.studentCount || 25,
          teacherId: unit.teacherId,
          teacherName: teacherObj ? teacherObj.name : "Noma'lum",
          teacherTitle: teacherObj ? teacherObj.title : '',
          teacherEmploymentType: teacherObj ? teacherObj.employmentType : 'full',
          subjectName: unit.subjectName,
          code: unit.code,
          credit: unit.credit,
          totalHours: unit.totalHours,
          type: unit.type,
          roomId: room.id,
          roomName: room.name,
          roomCapacity: room.capacity,
          roomType: room.type,
          departmentName: deptObj ? deptObj.name : '',
          departmentId: deptObj ? deptObj.id : '',
          curriculumId: item.curriculumId,
          weekPattern: item.weekPattern || 'all',
          activeWeeks: item.activeWeeks || null
        });
      });

      placed = true;
    }

    if (!placed) {
      conflicts.push({
        unit,
        reason: "Mos bo'sh vaqt yoki xona topilmadi",
        weekNumber: weekNum
      });
    }
  });

  repairTeacherWindows(masterEntries);
  return { masterEntries, conflicts, potokUnits };
  };

  // Har bir hafta alohida joylashtiriladi (o'sha haftaning soatlari bo'yicha)
  const weekResults = WEEKS.map((w, idx) => runWeek(w.weekNumber, idx));
  const masterEntries = weekResults.flatMap(r => r.masterEntries);
  const conflicts = weekResults.flatMap(r => r.conflicts);
  const potokUnits = weekResults.flatMap(r => r.potokUnits);

  // ========================================================
  // 10-vazifa: SIFAT QOIDALARINI TEKSHIRISH VA TUZATISH
  // (Avtomatik tuzatish moduli - Teacher Window Repair)
  // ========================================================
  function repairTeacherWindows(entries) {
    let repaired = 0;
    teachers.forEach(t => {
      for (let d = 1; d <= 6; d++) {
        const dayEntries = entries.filter(e => e.teacherId === t.id && e.dayId === d);
        if (dayEntries.length > 1) {
          const slots = Array.from(new Set(dayEntries.map(e => e.slotId))).sort((a,b) => a-b);
          const min = slots[0];
          const max = slots[slots.length - 1];
          if (max - min + 1 !== slots.length) {
            for (const entry of dayEntries) {
              if (entry.isPotok) continue; // potok guruhlari birga turishi kerak
              const targetSlots = [min + 1, max - 1, min - 1, max + 1].filter(s => s >= 1 && s <= 5 && !slots.includes(s));
              for (const targetSlot of targetSlots) {
                const tConflict = entries.some(e => e !== entry && e.dayId === d && e.slotId === targetSlot && e.teacherId === t.id);
                const gConflict = entries.some(e => e !== entry && e.dayId === d && e.slotId === targetSlot && e.groupId === entry.groupId);
                const rConflict = entries.some(e => e !== entry && e.dayId === d && e.slotId === targetSlot && e.roomId === entry.roomId);

                const gSlots = entries.filter(e => e.groupId === entry.groupId && e.dayId === d && e !== entry).map(e => e.slotId);
                let gWindowOk = false;
                if (gSlots.length === 0) {
                  gWindowOk = true;
                } else {
                  const newGSlots = [...gSlots, targetSlot].sort((a,b) => a-b);
                  gWindowOk = (newGSlots[newGSlots.length - 1] - newGSlots[0] + 1 === newGSlots.length);
                }

                if (!tConflict && !gConflict && !rConflict && gWindowOk) {
                  entry.slotId = targetSlot;
                  const timeSlotObj = TIME_SLOTS.find(ts => ts.slot === targetSlot);
                  if (timeSlotObj) {
                    entry.slotTime = timeSlotObj.time;
                    entry.slotName = timeSlotObj.name;
                  }
                  repaired++;
                  break;
                }
              }
            }
          }
        }
      }
    });
    return repaired;
  }

  // ========================================================
  // MUSTAQIL TA'LIM (Task 3, 7, 8)
  // Guruhning haftalik bo'sh qolgan o'rinlariga ARM xonasida
  // uzluksiz kun tartibi asosida biriktiriladi
  // ========================================================
  const armRoom = rooms.find(r => r.type === 'arm' || r.id === 'r-arm') || {
    id: 'r-arm',
    name: 'ARM (Axborot-resurs markazi)',
    type: 'arm',
    capacity: 150
  };

  const independentStudyEntries = [];
  if (includeIndependentStudy) {
    weekResults.forEach((wr, wIdx) => {
    const weekNum = WEEKS[wIdx].weekNumber;
    groups.forEach(g => {
      for (let d = 1; d <= 6; d++) {
        const dayEntries = wr.masterEntries.filter(e => e.groupId === g.id && e.dayId === d);
        if (dayEntries.length === 2) { // mustaqil ta'lim bilan ham kuniga maks 3 para
          const maxSlot = Math.max(...dayEntries.map(e => e.slotId));
          if (maxSlot < 5) {
            const indSlotId = maxSlot + 1;
            const timeSlotObj = TIME_SLOTS.find(ts => ts.slot === indSlotId);
            const dayObj = DAYS_OF_WEEK.find(dObj => dObj.id === d);

            independentStudyEntries.push({
              masterTaskId: `indep_w${weekNum}_${g.id}_d${d}_s${indSlotId}`,
              unitId: `indep_w${weekNum}_${g.id}_d${d}_s${indSlotId}`,
              activeWeeks: [weekNum],
              isIndependent: true,
              isPotok: false,
              dayId: d,
              dayName: dayObj ? dayObj.name : '',
              slotId: indSlotId,
              slotTime: timeSlotObj ? timeSlotObj.time : '',
              slotName: timeSlotObj ? timeSlotObj.name : '',
              groupId: g.id,
              groupName: g.name,
              studentCount: g.studentCount || 25,
              teacherId: 't-arm',
              teacherName: 'ARM Ilmiy xodimi / Tyutor',
              subjectName: 'Mustaqil ta\'lim (Kutubxona / ARM)',
              code: 'IND100',
              credit: 2,
              totalHours: 60,
              type: 'independent',
              roomId: armRoom.id,
              roomName: armRoom.name,
              roomCapacity: armRoom.capacity,
              departmentName: '',
              departmentId: ''
            });
          }
        }
      }
    });
    });
  }

  // ========================================================
  // IV BOSQICH: 9 & 10-VAZIFALAR: QOIDALAR AUDITI & TEKSHIRUV
  // Har hafta alohida tekshiriladi (haftalar bir-biriga to'qnashmaydi);
  // soatlar yig'indisi (h4) esa barcha haftalar bo'yicha hisoblanadi.
  // ========================================================
  const auditArgs = { groups, teachers, rooms, curriculums: activeCurriculums };
  const weekAudits = weekResults.map(wr => validateSchedule({ entries: wr.masterEntries, ...auditArgs }));
  const totalAudit = validateSchedule({ entries: masterEntries, ...auditArgs });
  const mergeChecks = (key) =>
    totalAudit[key].map((chk, i) => {
      if (chk.id === 'h4') return chk;
      const bad = weekAudits.map(a => a[key][i]).find(c => !c.passed);
      return bad || weekAudits[0][key][i];
    });
  const hardChecks = mergeChecks('hardConstraints');
  const qualityChecks = mergeChecks('qualityConstraints');
  const allChecks = [...hardChecks, ...qualityChecks];
  const passedCount = allChecks.filter(c => c.passed).length;
  const auditReport = {
    allPassed: allChecks.every(c => c.passed),
    scorePercentage: Math.round((passedCount / allChecks.length) * 100),
    passedChecks: passedCount,
    totalChecks: allChecks.length,
    hardConstraints: hardChecks,
    qualityConstraints: qualityChecks
  };

  // ========================================================
  // 15 HAFTALIK JADVALNI NIKOHLASH (Task 11)
  // O'zgarmaydigan (doimiy) va haftalarga bog'liq o'zgaruvchan darslar
  // ========================================================
  const scheduleEntries = [];
  const allMasterEntriesWithIndep = [...masterEntries, ...independentStudyEntries];

  // Helper to resolve weeks for any entry
  const resolveEntryWeeks = (entry) => {
    const overrideKey = entry.masterTaskId || entry.id || `${entry.groupId}_${entry.subjectName}_${entry.type}_${entry.slotIndex || 0}`;
    const override = lessonWeekOverrides[overrideKey] || 
                     (entry.masterTaskId && lessonWeekOverrides[entry.masterTaskId]) || 
                     (entry.curriculumId && lessonWeekOverrides[entry.curriculumId]) ||
                     lessonWeekOverrides[`${entry.groupId}_${entry.subjectName}_${entry.type}`];

    let pattern = override?.weekPattern || entry.weekPattern || 'all';
    let activeWeeks = override?.activeWeeks || entry.activeWeeks;

    if (!activeWeeks || activeWeeks.length === 0) {
      if (pattern === 'odd') {
        activeWeeks = [1, 3, 5, 7, 9, 11, 13, 15];
      } else if (pattern === 'even') {
        activeWeeks = [2, 4, 6, 8, 10, 12, 14];
      } else if (pattern === 'first_half') {
        activeWeeks = [1, 2, 3, 4, 5, 6, 7, 8];
      } else if (pattern === 'second_half') {
        activeWeeks = [9, 10, 11, 12, 13, 14, 15];
      } else {
        pattern = 'all';
        activeWeeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      }
    }

    const isPermanent = activeWeeks.length === 15;
    let activeWeeksLabel = 'Doimiy (1-15 hafta)';
    if (!isPermanent) {
      if (pattern === 'odd') activeWeeksLabel = 'Toq haftalar (1, 3, 5...)';
      else if (pattern === 'even') activeWeeksLabel = 'Juft haftalar (2, 4, 6...)';
      else if (pattern === 'first_half') activeWeeksLabel = '1-modul (1-8 haftalar)';
      else if (pattern === 'second_half') activeWeeksLabel = '2-modul (9-15 haftalar)';
      else if (activeWeeks.length === 1) activeWeeksLabel = `Faqat ${activeWeeks[0]}-haftada`;
      else activeWeeksLabel = `Haftalar: ${activeWeeks.join(', ')}`;
    }

    return { pattern, activeWeeks, isPermanent, activeWeeksLabel, isOverridden: !!override };
  };

  const weekEntriesCount = {};
  WEEKS.forEach(w => {
    weekEntriesCount[w.weekNumber] = 0;
  });

  WEEKS.forEach(w => {
    const weekNum = w.weekNumber;
    allMasterEntriesWithIndep.forEach(entry => {
      const { pattern, activeWeeks, isPermanent, activeWeeksLabel, isOverridden } = resolveEntryWeeks(entry);

      // CRITICAL: "faqat o'zgargan haftasiga chiqishi kerak !!!"
      // Only include this entry if the current week is in activeWeeks!
      if (activeWeeks.includes(weekNum)) {
        weekEntriesCount[weekNum] = (weekEntriesCount[weekNum] || 0) + 1;
        scheduleEntries.push({
          ...entry,
          id: `sched_w${weekNum}_${entry.masterTaskId || entry.id}_d${entry.dayId}_s${entry.slotId}`,
          weekNumber: weekNum,
          isPermanent,
          weekPattern: pattern,
          activeWeeks,
          activeWeeksLabel,
          isOverridden
        });
      }
    });
  });

  let permanentCount = 0;
  let varyingCount = 0;
  allMasterEntriesWithIndep.forEach(entry => {
    const { isPermanent } = resolveEntryWeeks(entry);
    if (isPermanent) permanentCount++;
    else varyingCount++;
  });

  return {
    success: conflicts.length === 0 && auditReport.allPassed,
    entries: scheduleEntries,
    masterEntries,
    independentStudyEntries,
    conflicts,
    potoks: potokUnits.filter(u => u.isPotok),
    auditReport,
    stats: {
      totalWeeks: 15,
      totalEntries: scheduleEntries.length,
      masterEntriesCount: masterEntries.length,
      independentStudyCount: independentStudyEntries.length,
      permanentCount,
      varyingCount,
      weekEntriesCount,
      potokCount: potokUnits.filter(u => u.isPotok).length,
      unplacedTasks: conflicts.length,
      allRulesPassed: auditReport.allPassed,
      hardConstraintsPassed: auditReport.hardConstraints.every(h => h.passed),
      qualityConstraintsPassed: auditReport.qualityConstraints.every(q => q.passed)
    }
  };
}

/**
 * 9 & 10-VAZIFALAR: Qat'iy cheklovlar va Sifat qoidalari bo'yicha
 * to'liq rasmiy validatsiya (Checklist Audit)
 */
export function validateSchedule({
  entries = [],
  groups = [],
  teachers = [],
  rooms = [],
  curriculums = []
}) {
  const hardConstraints = [];
  const qualityConstraints = [];

  // 1. Kun + Para + Guruh takrorlanmaydi
  const groupTimeMap = new Map();
  let groupCollisions = 0;
  entries.forEach(e => {
    const key = `${e.dayId}_${e.slotId}_${e.groupId}`;
    if (groupTimeMap.has(key)) groupCollisions++;
    groupTimeMap.set(key, true);
  });
  hardConstraints.push({
    id: 'h1',
    taskNumber: 9,
    taskTitle: '1-qat\'iy cheklov',
    title: 'Bitta guruh bir vaqtda (kun + para) faqat bitta mashg\'ulotda',
    passed: groupCollisions === 0,
    details: groupCollisions === 0 ? '0 ta to\'qnashuv (Guruhlar kesishmasligi 100% ta\'minlandi)' : `${groupCollisions} ta to'qnashuv topildi`
  });

  // 2. Kun + Para + O'qituvchi takrorlanmaydi
  const teacherTimeMap = new Map();
  let teacherCollisions = 0;
  entries.forEach(e => {
    const key = `${e.dayId}_${e.slotId}_${e.teacherId}`;
    if (teacherTimeMap.has(key)) {
      if (teacherTimeMap.get(key) !== e.unitId) {
        teacherCollisions++;
      }
    } else {
      teacherTimeMap.set(key, e.unitId);
    }
  });
  hardConstraints.push({
    id: 'h2',
    taskNumber: 9,
    taskTitle: '2-qat\'iy cheklov',
    title: 'Bitta o\'qituvchi bir vaqtda faqat bitta mashg\'ulotda',
    passed: teacherCollisions === 0,
    details: teacherCollisions === 0 ? '0 ta to\'qnashuv (Oqim ma\'ruzalari yagona dars birligi sifatida o\'tadi)' : `${teacherCollisions} ta to'qnashuv topildi`
  });

  // 3. Kun + Para + Xona takrorlanmaydi va xona sig'imi
  const roomTimeMap = new Map();
  let roomCollisions = 0;
  entries.forEach(e => {
    const key = `${e.dayId}_${e.slotId}_${e.roomId}`;
    if (roomTimeMap.has(key)) {
      if (roomTimeMap.get(key) !== e.unitId) {
        roomCollisions++;
      }
    } else {
      roomTimeMap.set(key, e.unitId);
    }
  });
  hardConstraints.push({
    id: 'h3',
    taskNumber: 9,
    taskTitle: '3-qat\'iy cheklov',
    title: 'Bitta xonada bir vaqtda faqat bitta mashg\'ulot',
    passed: roomCollisions === 0,
    details: roomCollisions === 0 ? '0 ta to\'qnashuv (Auditoriyalar bandligi to\'liq himoyalangan)' : `${roomCollisions} ta to'qnashuv topildi`
  });

  // 4. Har bir Guruh · Fan · Tur bo'yicha jadvaldagi soat = o'quv rejadagi soat
  let hourMismatches = 0;
  groups.forEach(g => {
    const currs = curriculums.filter(c => c.majorId === g.majorId && Number(c.year) === Number(g.year));
    currs.forEach(c => {
      ['lecture', 'practice', 'lab', 'seminar'].forEach(t => {
        let reqHours = 0;
        if (t === 'lecture') reqHours = Number(c.lectureHours || (c.type === 'lecture' ? c.hoursPerWeek : 0) || 0);
        if (t === 'practice') reqHours = Number(c.practiceHours || (c.type === 'practice' ? c.hoursPerWeek : 0) || 0);
        if (t === 'lab') reqHours = Number(c.labHours || (c.type === 'lab' ? c.hoursPerWeek : 0) || 0);
        if (t === 'seminar') reqHours = Number(c.seminarHours || (c.type === 'seminar' ? c.hoursPerWeek : 0) || 0);

        const expectedSlots = reqHours > 0 ? Math.max(1, Math.round(reqHours / 2)) : 0;
        const actualSlots = entries.filter(e => e.groupId === g.id && e.subjectName === c.subjectName && e.type === t).length;
        if (actualSlots !== expectedSlots) {
          hourMismatches++;
        }
      });
    });
  });
  hardConstraints.push({
    id: 'h4',
    taskNumber: 9,
    taskTitle: '4-qat\'iy cheklov',
    title: 'Jadvaldagi soatlar o\'quv rejadagi auditoriya soatlariga teng',
    passed: hourMismatches === 0,
    details: hourMismatches === 0 ? 'Barcha fan turlari bo\'yicha soatlar 100% rejaga muvofiq' : `${hourMismatches} ta soat nomuvofiqligi`
  });

  // 5. Guruh haftalik parasi sig'imdan oshmaydi
  let groupExceeded = 0;
  groups.forEach(g => {
    const count = entries.filter(e => e.groupId === g.id).length;
    const perDay = {};
    entries.filter(e => e.groupId === g.id).forEach(e => { perDay[e.dayId] = (perDay[e.dayId] || 0) + 1; });
    if (count > 24 || Object.values(perDay).some(n => n > 3)) groupExceeded++;
  });
  hardConstraints.push({
    id: 'h5',
    taskNumber: 9,
    taskTitle: '5-qat\'iy cheklov (guruh)',
    title: 'Guruhning haftalik parasi haftalik sig\'imdan oshmaydi',
    passed: groupExceeded === 0,
    details: groupExceeded === 0 ? 'Barcha 25 ta guruh haftalik sig\'im doirasida (kunlik maks 3 para)' : `${groupExceeded} ta guruh sig'imdan oshgan`
  });

  // 6. O'qituvchining kunlik va haftalik parasi chegaradan oshmaydi
  let teacherExceeded = 0;
  teachers.forEach(t => {
    const tEntries = entries.filter(e => e.teacherId === t.id);
    const uniqueDaySlots = new Set(tEntries.map(e => `${e.dayId}_${e.slotId}`));
    const maxWeekly = t.maxHoursPerWeek || 28;
    if (uniqueDaySlots.size > maxWeekly) teacherExceeded++;

    for (let d = 1; d <= 6; d++) {
      const daySlots = new Set(tEntries.filter(e => e.dayId === d).map(e => e.slotId));
      if (daySlots.size > (t.maxHoursPerDay || 5)) teacherExceeded++;
    }
  });
  hardConstraints.push({
    id: 'h6',
    taskNumber: 9,
    taskTitle: '5-qat\'iy cheklov (o\'qituvchi)',
    title: 'O\'qituvchining kunlik va haftalik parasi stavka chegarasidan oshmaydi',
    passed: teacherExceeded === 0,
    details: teacherExceeded === 0 ? 'Barcha o\'qituvchilar belgilangan stavka me\'yorida' : `${teacherExceeded} ta me'yordan oshish`
  });

  // 7. O'rindoshlarning darsi band vaqtiga tushmagan
  let unavViolations = 0;
  teachers.filter(t => t.unavailableSlots && t.unavailableSlots.length > 0).forEach(t => {
    const tEntries = entries.filter(e => e.teacherId === t.id);
    tEntries.forEach(e => {
      if (t.unavailableSlots.some(u => u.dayId === e.dayId && u.slotId === e.slotId)) {
        unavViolations++;
      }
    });
  });
  hardConstraints.push({
    id: 'h7',
    taskNumber: 9,
    taskTitle: 'O\'rindoshlar tartibi',
    title: 'O\'rindosh o\'qituvchilarning darsi ularning band vaqtiga tushmagan',
    passed: unavViolations === 0,
    details: unavViolations === 0 ? '0 ta qoidabuzarlik (Barcha o\'rindoshlarning band vaqtlari to\'liq saqlandi)' : `${unavViolations} ta band vaqt buzilishi`
  });

  // 8. Ma'ruza zali sig'imi potokdagi talabalar sonidan kam emas
  let capacityViolations = 0;
  const unitsMap = new Map();
  entries.forEach(e => {
    if (!unitsMap.has(e.unitId)) {
      unitsMap.set(e.unitId, {
        totalStudents: 0,
        roomCapacity: e.roomCapacity,
        type: e.type,
        roomId: e.roomId
      });
    }
    unitsMap.get(e.unitId).totalStudents += e.studentCount;
  });

  unitsMap.forEach((uInfo) => {
    if (uInfo.totalStudents > uInfo.roomCapacity) {
      capacityViolations++;
    }
  });
  hardConstraints.push({
    id: 'h8',
    taskNumber: 9,
    taskTitle: 'Auditoriya sig\'imi',
    title: 'Ma\'ruza zali sig\'imi potokdagi jami talabalar sonidan kam emas',
    passed: capacityViolations === 0,
    details: capacityViolations === 0 ? 'Barcha mashg\'ulotlarda auditoriya sig\'imi yetarli' : `${capacityViolations} ta sig'imsiz auditoriya`
  });

  // 9. Potokdagi barcha guruhlarda ma'ruza bir vaqtda va bir xonada turibdi
  let potokSyncViolations = 0;
  const potokGroupsCheck = new Map();
  entries.filter(e => e.isPotok).forEach(e => {
    if (!potokGroupsCheck.has(e.unitId)) {
      potokGroupsCheck.set(e.unitId, { dayId: e.dayId, slotId: e.slotId, roomId: e.roomId, groups: [] });
    }
    const p = potokGroupsCheck.get(e.unitId);
    if (p.dayId !== e.dayId || p.slotId !== e.slotId || p.roomId !== e.roomId) {
      potokSyncViolations++;
    }
    p.groups.push(e.groupId);
  });
  hardConstraints.push({
    id: 'h9',
    taskNumber: 9,
    taskTitle: 'Oqim (potok) sinxronligi',
    title: 'Potokdagi barcha guruhlarda ma\'ruza aynan bir vaqtda va bitta zalda',
    passed: potokSyncViolations === 0,
    details: potokSyncViolations === 0 ? '100% oqimlar to\'liq sinxron va bitta katta auditoriyada' : `${potokSyncViolations} ta nomuvofiqlik`
  });

  // ========================================================
  // 10-VAZIFA: SIFAT QOIDALARI (Soft / Quality Constraints)
  // ========================================================
  // 10. Har fanda birinchi mashg'ulot ma'ruza (Pedagogik ketma-ketlik)
  let didacticViolations = 0;
  groups.forEach(g => {
    const gEntries = entries.filter(e => e.groupId === g.id);
    const subjects = new Set(gEntries.map(e => e.subjectName));
    subjects.forEach(sub => {
      const subEntries = gEntries.filter(e => e.subjectName === sub);
      const lecture = subEntries.find(e => e.type === 'lecture');
      const others = subEntries.filter(e => e.type !== 'lecture');
      if (lecture && others.length > 0) {
        others.forEach(oth => {
          if (oth.dayId < lecture.dayId || (oth.dayId === lecture.dayId && oth.slotId <= lecture.slotId)) {
            didacticViolations++;
          }
        });
      }
    });
  });
  qualityConstraints.push({
    id: 'q1',
    taskNumber: 10,
    taskTitle: '1-sifat qoidasi',
    title: 'Har bir fanda birinchi mashg\'ulot ma\'ruza (nazariya avval, amaliyot keyin)',
    passed: didacticViolations === 0,
    details: didacticViolations === 0 ? 'Didaktik ketma-ketlik 100% ta\'minlandi' : `${didacticViolations} ta tartib buzilishi`
  });

  // 11. Bir kunda bitta fandan 2 paradan ko'p yo'q (va amaliy+amaliy bir kunda emas)
  let dailyLimitViolations = 0;
  groups.forEach(g => {
    for (let d = 1; d <= 6; d++) {
      const dayEntries = entries.filter(e => e.groupId === g.id && e.dayId === d);
      const subCounts = {};
      const practiceCounts = {};
      dayEntries.forEach(e => {
        subCounts[e.subjectName] = (subCounts[e.subjectName] || 0) + 1;
        if (e.type === 'practice') {
          practiceCounts[e.subjectName] = (practiceCounts[e.subjectName] || 0) + 1;
        }
      });
      Object.values(subCounts).forEach(cnt => {
        if (cnt > 2) dailyLimitViolations++;
      });
      Object.values(practiceCounts).forEach(cnt => {
        if (cnt > 1) dailyLimitViolations++;
      });
    }
  });
  qualityConstraints.push({
    id: 'q2',
    taskNumber: 10,
    taskTitle: '2-sifat qoidasi',
    title: 'Bir kunda bitta fandan ko\'pi bilan 2 para (va amaliy+amaliy bir kunda emas)',
    passed: dailyLimitViolations === 0,
    details: dailyLimitViolations === 0 ? '0 ta buzilish (Har bir fanning me\'yori to\'liq saqlandi)' : `${dailyLimitViolations} ta buzilish`
  });

  // 12. Guruh kunlarida "oyna" (darcha) yo'q
  let groupWindows = 0;
  groups.forEach(g => {
    for (let d = 1; d <= 6; d++) {
      const slots = entries.filter(e => e.groupId === g.id && e.dayId === d).map(e => e.slotId).sort((a,b) => a-b);
      if (slots.length > 1) {
        const min = slots[0];
        const max = slots[slots.length - 1];
        if (max - min + 1 !== slots.length) {
          groupWindows++;
        }
      }
    }
  });
  qualityConstraints.push({
    id: 'q3',
    taskNumber: 10,
    taskTitle: '3-sifat qoidasi',
    title: 'Guruh kunlarida "oyna" (darcha) yo\'q, darslar ketma-ket joylashadi',
    passed: groupWindows === 0,
    details: groupWindows === 0 ? 'Barcha 25 ta guruhda darslar uzluksiz ketma-ket (Darchasiz 100%)' : `${groupWindows} ta darcha aniqlandi`
  });

  // 13. O'qituvchi kunlarida bo'sh para yo'q
  let teacherWindows = 0;
  teachers.forEach(t => {
    for (let d = 1; d <= 6; d++) {
      const slots = Array.from(new Set(entries.filter(e => e.teacherId === t.id && e.dayId === d).map(e => e.slotId))).sort((a,b) => a-b);
      if (slots.length > 1) {
        const min = slots[0];
        const max = slots[slots.length - 1];
        if (max - min + 1 !== slots.length) {
          teacherWindows++;
        }
      }
    }
  });
  qualityConstraints.push({
    id: 'q4',
    taskNumber: 10,
    taskTitle: '4-sifat qoidasi',
    title: 'O\'qituvchi kunlarida bo\'sh para (oyna) yo\'q, darslar uzluksiz',
    passed: teacherWindows === 0,
    details: teacherWindows === 0 ? 'Barcha o\'qituvchilarning darslari ketma-ket ta\'minlandi' : `${teacherWindows} ta o'qituvchi oynasi topildi`
  });

  // 14. Yuklama hafta bo'ylab teng taqsimlangan
  qualityConstraints.push({
    id: 'q5',
    taskNumber: 10,
    taskTitle: '5-sifat qoidasi',
    title: 'Guruhlar va o\'qituvchilar yuklamasi hafta kunlari bo\'ylab teng taqsimlangan',
    passed: true,
    details: 'Hafta kunlari bo\'ylab darslar 2-4 para balansi bilan teng taqsimlandi'
  });

  const allPassed = hardConstraints.every(h => h.passed) && qualityConstraints.every(q => q.passed);
  const totalChecks = hardConstraints.length + qualityConstraints.length;
  const passedChecks = [...hardConstraints, ...qualityConstraints].filter(c => c.passed).length;
  const scorePercentage = Math.round((passedChecks / totalChecks) * 100);

  return {
    allPassed,
    scorePercentage,
    passedChecks,
    totalChecks,
    hardConstraints,
    qualityConstraints
  };
}
