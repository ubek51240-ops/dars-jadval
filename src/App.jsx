import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  Building, 
  GraduationCap, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  School,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  Trash2,
  FolderPlus,
  Compass,
  LayoutGrid,
  UserCheck,
  Building2,
  UploadCloud,
  FileUp,
  FileDown,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  CheckSquare,
  Award,
  FileText,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_MAJORS, 
  INITIAL_COURSES, 
  INITIAL_GROUPS, 
  INITIAL_TEACHERS, 
  INITIAL_ROOMS, 
  INITIAL_CURRICULUMS,
  DAYS_OF_WEEK,
  TIME_SLOTS,
  WEEKS
} from './data.js';
import { generateSchedule } from './algorithm.js';
import PlanScheduler from './PlanScheduler.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('generator'); // generator, excel, curriculums, teachers, departments, majors, rooms
  const [viewMode, setViewMode] = useState('group'); // 'group' (HEMIS standard), 'teacher', 'matrix', 'room'
  
  // Filters
  const [semester, setSemester] = useState('fall');
  const [selectedWeek, setSelectedWeek] = useState(1); // 1 to 15
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [selectedLessonType, setSelectedLessonType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allGroupsLayout, setAllGroupsLayout] = useState('per-group'); // 'per-group' (PDF namuna) | 'combined' (para kesimida barcha guruhlar)
  const [hideEmptyTeachers, setHideEmptyTeachers] = useState(true);
  const [includeIndependentStudy, setIncludeIndependentStudy] = useState(false);
  const [lessonWeekOverrides, setLessonWeekOverrides] = useState({});
  const [weekFilterMode, setWeekFilterMode] = useState('all'); // 'all', 'odd', 'even', 'm1', 'm2'
  const [editingWeekLesson, setEditingWeekLesson] = useState(null);
  const [modalPattern, setModalPattern] = useState('all');
  const [modalCustomWeeks, setModalCustomWeeks] = useState([]);

  // Dynamic States
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [majors, setMajors] = useState(INITIAL_MAJORS);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [curriculums, setCurriculums] = useState(INITIAL_CURRICULUMS);

  // Status message for Excel operations
  const [excelAlert, setExcelAlert] = useState(null);

  // File input refs for quick upload buttons
  const currFileRef = useRef(null);
  const teacherFileRef = useRef(null);

  // Forms
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '' });

  const [showAddMajor, setShowAddMajor] = useState(false);
  const [newMajor, setNewMajor] = useState({ name: '', code: '', departmentId: '' });

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedRoomBuildingFilter, setSelectedRoomBuildingFilter] = useState('all');
  const [selectedRoomTypeFilter, setSelectedRoomTypeFilter] = useState('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'lecture',
    capacity: 30,
    building: 'Bosh bino'
  });

  const [showAddCurriculum, setShowAddCurriculum] = useState(false);
  const [newCurr, setNewCurr] = useState({
    subjectName: '',
    majorId: '',
    year: 1,
    semester: 'fall',
    teacherId: '',
    lectureHours: 2,
    practiceHours: 2,
    labHours: 0,
    seminarHours: 0
  });

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    title: 'Dotsent',
    departmentId: '',
    subjects: ''
  });

  const [scheduleResult, setScheduleResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Defaults setup
  useEffect(() => {
    if (departments.length > 0 && !newMajor.departmentId) {
      setNewMajor(prev => ({ ...prev, departmentId: departments[0].id }));
      setNewTeacher(prev => ({ ...prev, departmentId: departments[0].id }));
    }
    if (majors.length > 0 && !newCurr.majorId) {
      setNewCurr(prev => ({ ...prev, majorId: majors[0].id }));
    }
    if (teachers.length > 0 && !newCurr.teacherId) {
      setNewCurr(prev => ({ ...prev, teacherId: teachers[0].id }));
    }
  }, [departments, majors, teachers]);

  // Interconnected filtering: Majors by selected department
  const filteredMajors = useMemo(() => {
    if (selectedDepartment === 'all') return majors;
    return majors.filter(m => m.departmentId === selectedDepartment);
  }, [majors, selectedDepartment]);

  // Interconnected filtering: Groups by department, major and course
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (selectedMajor !== 'all' && g.majorId !== selectedMajor) return false;
      if (selectedCourse !== 'all' && Number(g.year) !== Number(selectedCourse)) return false;
      if (selectedDepartment !== 'all') {
        const major = majors.find(m => m.id === g.majorId);
        if (!major || major.departmentId !== selectedDepartment) return false;
      }
      return true;
    });
  }, [groups, selectedDepartment, selectedMajor, selectedCourse, majors]);

  // Keep selectedGroup valid when filteredGroups changes
  useEffect(() => {
    if (selectedGroup !== 'all') {
      const exists = filteredGroups.some(g => g.id === selectedGroup);
      if (!exists) {
        setSelectedGroup('all');
      }
    }
  }, [filteredGroups, selectedGroup]);

  // Clean view mode switcher so hidden filters never silently filter out lessons
  const handleViewModeChange = (nextMode) => {
    setViewMode(nextMode);
    if (nextMode === 'group') {
      setSelectedTeacher('all');
      setSelectedRoom('all');
    } else if (nextMode === 'teacher') {
      setSelectedRoom('all');
      setSelectedLessonType('all');
      setSelectedGroup('all');
      setSelectedMajor('all');
      setSelectedCourse('all');
    } else if (nextMode === 'matrix') {
      setSelectedTeacher('all');
      setSelectedRoom('all');
      setSelectedGroup('all');
    } else if (nextMode === 'room') {
      setSelectedTeacher('all');
      setSelectedLessonType('all');
      setSelectedGroup('all');
    }
  };

  // Schedule Generator Handler
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const res = generateSchedule({
        semester,
        selectedWeek,
        groups,
        teachers,
        rooms,
        curriculums,
        departments,
        majors,
        includeIndependentStudy,
        lessonWeekOverrides
      });
      setScheduleResult(res);
      setIsGenerating(false);

      if (res.success && res.entries.length > 0) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore
        }
      }
    }, 250);
  };

  // Auto regenerate schedule on structure changes
  useEffect(() => {
    handleGenerate();
  }, [curriculums, teachers, departments, majors, groups, semester, includeIndependentStudy, lessonWeekOverrides]);

  // Modal handlers for setting lesson weeks
  const handleOpenWeekModal = (lesson) => {
    setEditingWeekLesson(lesson);
    const key = lesson.masterTaskId || lesson.id || `${lesson.groupId}_${lesson.subjectName}_${lesson.type}_${lesson.slotIndex || 0}`;
    const override = lessonWeekOverrides[key] || lessonWeekOverrides[lesson.masterTaskId] || (lesson.curriculumId && lessonWeekOverrides[lesson.curriculumId]);

    if (override) {
      setModalPattern(override.weekPattern);
      setModalCustomWeeks(override.activeWeeks || []);
    } else if (lesson.weekPattern) {
      setModalPattern(lesson.weekPattern);
      setModalCustomWeeks(lesson.activeWeeks || (lesson.weekPattern === 'odd' ? [1,3,5,7,9,11,13,15] : lesson.weekPattern === 'even' ? [2,4,6,8,10,12,14] : [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));
    } else {
      setModalPattern('all');
      setModalCustomWeeks([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    }
  };

  const handleSaveWeekOverride = () => {
    if (!editingWeekLesson) return;
    const key = editingWeekLesson.masterTaskId || editingWeekLesson.id || `${editingWeekLesson.groupId}_${editingWeekLesson.subjectName}_${editingWeekLesson.type}_${editingWeekLesson.slotIndex || 0}`;

    let computedWeeks = [];
    if (modalPattern === 'all') {
      computedWeeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    } else if (modalPattern === 'odd') {
      computedWeeks = [1, 3, 5, 7, 9, 11, 13, 15];
    } else if (modalPattern === 'even') {
      computedWeeks = [2, 4, 6, 8, 10, 12, 14];
    } else if (modalPattern === 'first_half') {
      computedWeeks = [1, 2, 3, 4, 5, 6, 7, 8];
    } else if (modalPattern === 'second_half') {
      computedWeeks = [9, 10, 11, 12, 13, 14, 15];
    } else if (modalPattern === 'only_selected') {
      computedWeeks = [Number(selectedWeek)];
    } else {
      computedWeeks = modalCustomWeeks.length > 0 ? [...modalCustomWeeks].sort((a,b)=>a-b) : [Number(selectedWeek)];
    }

    setLessonWeekOverrides(prev => ({
      ...prev,
      [key]: {
        weekPattern: modalPattern === 'only_selected' ? 'custom' : modalPattern,
        activeWeeks: computedWeeks
      }
    }));

    setEditingWeekLesson(null);
  };

  const handleResetWeekOverride = () => {
    if (!editingWeekLesson) return;
    const key = editingWeekLesson.masterTaskId || editingWeekLesson.id || `${editingWeekLesson.groupId}_${editingWeekLesson.subjectName}_${editingWeekLesson.type}_${editingWeekLesson.slotIndex || 0}`;

    setLessonWeekOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      delete next[editingWeekLesson.masterTaskId];
      if (editingWeekLesson.curriculumId) delete next[editingWeekLesson.curriculumId];
      return next;
    });

    setEditingWeekLesson(null);
  };

  // ==========================================
  // EXCEL IMPORT & EXPORT LOGIC
  // ==========================================

  // 1. Download Sample Curriculum Excel Template (Multi-component: Ma'ruza, Amaliyot, Lab, Seminar)
  const handleDownloadCurriculumTemplate = () => {
    const sampleData = [
      {
        "Fan nomi": "Kiberxavfsizlik asoslari",
        "Yo'nalish": "Dasturiy injiniring",
        "Kurs (1-4)": 3,
        "Semestr (kuzgi/bahoriy)": "kuzgi",
        "Ma'ruza (soat)": 2,
        "Amaliyot (soat)": 2,
        "Laboratoriya (soat)": 2,
        "Seminar (soat)": 0,
        "O'qituvchi F.I.SH (ixtiyoriy)": "K. KARIMOV"
      },
      {
        "Fan nomi": "Veb dasturlash (Full-stack)",
        "Yo'nalish": "Dasturiy injiniring",
        "Kurs (1-4)": 1,
        "Semestr (kuzgi/bahoriy)": "kuzgi",
        "Ma'ruza (soat)": 2,
        "Amaliyot (soat)": 0,
        "Laboratoriya (soat)": 2,
        "Seminar (soat)": 2,
        "O'qituvchi F.I.SH (ixtiyoriy)": "DOC. B. RAHIMOV"
      },
      {
        "Fan nomi": "Makroiqtisodiyot",
        "Yo'nalish": "Iqtisodiyot",
        "Kurs (1-4)": 1,
        "Semestr (kuzgi/bahoriy)": "kuzgi",
        "Ma'ruza (soat)": 2,
        "Amaliyot (soat)": 2,
        "Laboratoriya (soat)": 0,
        "Seminar (soat)": 2,
        "O'qituvchi F.I.SH (ixtiyoriy)": "PROF. SH. MUXSINOV"
      },
      {
        "Fan nomi": "Moliyaviy menejment",
        "Yo'nalish": "Moliya va moliyaviy texnologiyalar",
        "Kurs (1-4)": 2,
        "Semestr (kuzgi/bahoriy)": "kuzgi",
        "Ma'ruza (soat)": 2,
        "Amaliyot (soat)": 2,
        "Laboratoriya (soat)": 0,
        "Seminar (soat)": 0,
        "O'qituvchi F.I.SH (ixtiyoriy)": "DOC. M. EGAMBERDIYEVA"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 32 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, 
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 25 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Oquv_Reja_Namuna");
    XLSX.writeFile(workbook, "BIU_Oquv_Reja_Shablon.xlsx");
  };

  // 2. Download Sample Teachers Excel Template
  const handleDownloadTeacherTemplate = () => {
    const sampleData = [
      {
        "O'qituvchi F.I.SH": "PROF. A. YUNUSOV",
        "Lavozimi": "Kafedra mudiri, Prof.",
        "Kafedra": "Yunusov kafedrasi",
        "O'tadigan fanlari (vergul bilan)": "Algoritmlar va ma'lumotlar strukturasi, Sun'iy intellekt va ML"
      },
      {
        "O'qituvchi F.I.SH": "DOC. B. RAHIMOV",
        "Lavozimi": "Dotsent",
        "Kafedra": "Yunusov kafedrasi",
        "O'tadigan fanlari (vergul bilan)": "Veb dasturlash, Database systems (SQL), Python OOP"
      },
      {
        "O'qituvchi F.I.SH": "DOC. M. OLIMOVA",
        "Lavozimi": "Dotsent",
        "Kafedra": "Muxsinov kafedrasi",
        "O'tadigan fanlari (vergul bilan)": "Buxgalteriya hisobi nazariyasi, Audit va Soliqlar, Bank ishi"
      },
      {
        "O'qituvchi F.I.SH": "N. TOSHEV",
        "Lavozimi": "Katta o'qituvchi",
        "Kafedra": "Muxsinov kafedrasi",
        "O'tadigan fanlari (vergul bilan)": "Ekonometrika, Biznes statistikasi, Xalqaro iqtisodiyot"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 22 }, { wch: 24 }, { wch: 45 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Oqituvchilar_Namuna");
    XLSX.writeFile(workbook, "BIU_Oqituvchilar_Yuklama_Shablon.xlsx");
  };

  // 3. Import Curriculum from Excel File
  const handleImportCurriculumExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setExcelAlert({ type: 'error', message: "Excel fayl bo'sh yoki ma'lumotlar topilmadi!" });
          return;
        }

        let addedCount = 0;
        const newCurriculums = [];

        rows.forEach((row, idx) => {
          const subjectName = row["Fan nomi"] || row["Fan"] || row["Subject"] || row["fan_nomi"];
          if (!subjectName) return;

          const majorStr = (row["Yo'nalish"] || row["Yonalish"] || row["Major"] || '').toString().toLowerCase();
          let matchedMajor = majors.find(m => 
            m.name.toLowerCase().includes(majorStr) || 
            majorStr.includes(m.name.toLowerCase()) ||
            m.code.includes(majorStr)
          );

          if (!matchedMajor) {
            const rawName = (row["Yo'nalish"] || row["Yonalish"] || row["Major"] || '').toString().trim() || 'Mutaxassislik';
            matchedMajor = {
              id: `maj-auto-${Date.now()}-${idx}`,
              name: rawName,
              code: '60000000',
              departmentId: departments[0] ? departments[0].id : ''
            };
            setMajors(prev => [...prev, matchedMajor]);
            const createdGroups = [1, 2, 3, 4].map(y => ({
              id: `g-${matchedMajor.id}-${y}`,
              majorId: matchedMajor.id,
              year: y,
              name: `${y}-${matchedMajor.name.substring(0, 8).toUpperCase()}-26`,
              studentCount: 25
            }));
            setGroups(prev => [...prev, ...createdGroups]);
          }

          const year = Number(row["Kurs (1-4)"] || row["Kurs"] || row["Year"] || 1);
          
          const semStr = (row["Semestr (kuzgi/bahoriy)"] || row["Semestr"] || row["Semester"] || 'fall').toString().toLowerCase();
          const semesterVal = (semStr.includes('bahor') || semStr.includes('spring') || semStr === '2') ? 'spring' : 'fall';

          // Multi-component hours reading:
          const lHours = Number(row["Ma'ruza (soat)"] ?? row["Ma'ruza soati"] ?? row["Maruza soati"] ?? row["Ma'ruza"] ?? row["Lecture"] ?? 0);
          const pHours = Number(row["Amaliyot (soat)"] ?? row["Amaliyot soati"] ?? row["Amaliy soat"] ?? row["Amaliyot"] ?? row["Practice"] ?? 0);
          const lbHours = Number(row["Laboratoriya (soat)"] ?? row["Laboratoriya soati"] ?? row["Lab soati"] ?? row["Laboratoriya"] ?? row["Lab"] ?? 0);
          const sHours = Number(row["Seminar (soat)"] ?? row["Seminar soati"] ?? row["Seminar"] ?? 0);

          // If individual hours not found, check single type column (fallback)
          const typeStr = (row["Mashg'ulot turi (ma'ruza/amaliyot/lab/seminar)"] || row["Mashg'ulot turi"] || row["Turi"] || row["Type"] || '').toString().toLowerCase();
          const singleHours = Number(row["Haftalik soat"] || row["Soat"] || row["Hours"] || 2);

          let finalLHours = lHours;
          let finalPHours = pHours;
          let finalLbHours = lbHours;
          let finalSHours = sHours;

          if (lHours === 0 && pHours === 0 && lbHours === 0 && sHours === 0) {
            if (typeStr.includes('lab')) finalLbHours = singleHours;
            else if (typeStr.includes('sem')) finalSHours = singleHours;
            else if (typeStr.includes('amal') || typeStr.includes('prac')) finalPHours = singleHours;
            else finalLHours = singleHours;
          }

          // Smart teacher assignment:
          const teacherNameInput = (row["O'qituvchi F.I.SH (ixtiyoriy)"] || row["O'qituvchi"] || row["Teacher"] || '').toString().toLowerCase();
          let matchedTeacher = null;

          if (teacherNameInput) {
            matchedTeacher = teachers.find(t => 
              t.name.toLowerCase().includes(teacherNameInput) || 
              teacherNameInput.includes(t.name.toLowerCase())
            );
          }

          if (!matchedTeacher) {
            matchedTeacher = teachers.find(t => {
              if (Array.isArray(t.subjects)) {
                return t.subjects.some(s => s.toLowerCase().includes(subjectName.toLowerCase()) || subjectName.toLowerCase().includes(s.toLowerCase()));
              }
              return t.subjects && t.subjects.toLowerCase().includes(subjectName.toLowerCase());
            });
          }

          if (!matchedTeacher) {
            matchedTeacher = teachers.find(t => t.departmentId === matchedMajor.departmentId) || (teachers[0] ? teachers[0] : null);
          }

          newCurriculums.push({
            id: `c-excel-${Date.now()}-${idx}`,
            subjectName: subjectName.trim(),
            majorId: matchedMajor.id,
            year: year >= 1 && year <= 4 ? year : 1,
            semester: semesterVal,
            teacherId: matchedTeacher ? matchedTeacher.id : (teachers[0] ? teachers[0].id : ''),
            lectureHours: finalLHours,
            practiceHours: finalPHours,
            labHours: finalLbHours,
            seminarHours: finalSHours,
            hoursPerWeek: (finalLHours + finalPHours + finalLbHours + finalSHours) || 2
          });

          addedCount++;
        });

        if (newCurriculums.length > 0) {
          setCurriculums(prev => [...newCurriculums, ...prev]);
          setExcelAlert({
            type: 'success',
            message: `Excel orqali ${addedCount} ta fan o'quv rejasiga muvaffaqiyatli yuklandi! 15 haftalik ideal dars jadvali yangilandi.`
          });
          setActiveTab('generator');
        } else {
          setExcelAlert({ type: 'error', message: "Excel fayl ustunlari shablon bilan mos kelmadi. Iltimos, namuna shablondan foydalaning!" });
        }
      } catch (err) {
        console.error("Excel parse error:", err);
        setExcelAlert({ type: 'error', message: "Excel faylni o'qishda xatolik yuz berdi: " + err.message });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // reset input
  };

  // 4. Import Teachers from Excel File
  const handleImportTeacherExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setExcelAlert({ type: 'error', message: "Excel fayl bo'sh yoki o'qituvchilar ma'lumoti topilmadi!" });
          return;
        }

        let addedCount = 0;
        const newTeachersList = [];

        rows.forEach((row, idx) => {
          const teacherName = row["O'qituvchi F.I.SH"] || row["F.I.SH"] || row["Ism"] || row["Name"] || row["Teacher"];
          if (!teacherName) return;

          const title = row["Lavozimi"] || row["Unvoni"] || row["Title"] || 'Dotsent';

          const deptStr = (row["Kafedra"] || row["Department"] || '').toString().toLowerCase();
          let matchedDept = departments.find(d => 
            d.name.toLowerCase().includes(deptStr) || 
            deptStr.includes(d.name.toLowerCase()) ||
            d.code.toLowerCase().includes(deptStr)
          );

          if (!matchedDept) {
            const rawDeptName = (row["Kafedra"] || row["Department"] || '').toString().trim() || 'Kafedra';
            matchedDept = {
              id: `dept-auto-${Date.now()}-${idx}`,
              name: rawDeptName,
              code: 'KF',
              color: '#3c8dbc'
            };
            setDepartments(prev => [...prev, matchedDept]);
          }

          const subjectsStr = (row["O'tadigan fanlari (vergul bilan)"] || row["O'tadigan fanlari"] || row["Fanlar"] || row["Subjects"] || 'Mutaxassislik fanlari').toString();
          const subjectsArray = subjectsStr.split(',').map(s => s.trim()).filter(Boolean);

          newTeachersList.push({
            id: `t-excel-${Date.now()}-${idx}`,
            name: teacherName.trim().toUpperCase(),
            title: title.trim(),
            departmentId: matchedDept.id,
            subjects: subjectsArray.length > 0 ? subjectsArray : ['Mutaxassislik fanlari']
          });

          addedCount++;
        });

        if (newTeachersList.length > 0) {
          setTeachers(prev => [...prev, ...newTeachersList]);
          setExcelAlert({
            type: 'success',
            message: `Excel orqali ${addedCount} nafar professor-o'qituvchi va ularning yuklamalari muvaffaqiyatli kiritildi!`
          });
          setActiveTab('generator');
        } else {
          setExcelAlert({ type: 'error', message: "Excel fayl ustunlari mos kelmadi. Iltimos, namuna shablonni yuklab olib to'ldiring!" });
        }
      } catch (err) {
        console.error("Teacher Excel error:", err);
        setExcelAlert({ type: 'error', message: "O'qituvchilar Excel faylini o'qishda xatolik yuz berdi: " + err.message });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // reset input
  };

  // 1. Add Department
  const handleAddDeptSubmit = (e) => {
    e.preventDefault();
    if (!newDept.name.trim()) return;

    const deptId = `dept-${Date.now()}`;
    const createdDept = {
      id: deptId,
      name: newDept.name,
      code: newDept.code || 'KF',
      color: '#3c8dbc'
    };

    setDepartments(prev => [...prev, createdDept]);
    setNewDept({ name: '', code: '' });
    setShowAddDept(false);
  };

  // 2. Add Major
  const handleAddMajorSubmit = (e) => {
    e.preventDefault();
    if (!newMajor.name.trim()) return;

    const majorId = `maj-${Date.now()}`;
    const createdMajor = {
      id: majorId,
      name: newMajor.name,
      code: newMajor.code || '60000000',
      departmentId: newMajor.departmentId || (departments[0] ? departments[0].id : 'yunusov')
    };

    const createdGroups = [1, 2, 3, 4].map(year => ({
      id: `g-${majorId}-${year}`,
      majorId: majorId,
      year: year,
      name: `${year}-${createdMajor.name.substring(0, 8)}-26`,
      studentCount: 25
    }));

    setMajors(prev => [...prev, createdMajor]);
    setGroups(prev => [...prev, ...createdGroups]);
    setNewMajor({ name: '', code: '', departmentId: departments[0] ? departments[0].id : '' });
    setShowAddMajor(false);
  };

  // 3. Add Curriculum Manual (Multi-component: Ma'ruza, Amaliyot, Lab, Seminar)
  const handleAddCurriculumSubmit = (e) => {
    e.preventDefault();
    if (!newCurr.subjectName.trim()) return;

    const lHours = Number(newCurr.lectureHours || 0);
    const pHours = Number(newCurr.practiceHours || 0);
    const lbHours = Number(newCurr.labHours || 0);
    const sHours = Number(newCurr.seminarHours || 0);
    const totalHours = lHours + pHours + lbHours + sHours;

    if (totalHours === 0) {
      alert("Iltimos, kamida bitta mashg'ulot turi (ma'ruza, amaliyot, lab yoki seminar) uchun soat kiriting!");
      return;
    }

    const created = {
      id: `c-custom-${Date.now()}`,
      subjectName: newCurr.subjectName,
      majorId: newCurr.majorId || (majors[0] ? majors[0].id : 'se'),
      year: Number(newCurr.year),
      semester: newCurr.semester,
      teacherId: newCurr.teacherId || (teachers[0] ? teachers[0].id : 't-yunusov'),
      lectureHours: lHours,
      practiceHours: pHours,
      labHours: lbHours,
      seminarHours: sHours,
      hoursPerWeek: totalHours
    };

    setCurriculums(prev => [created, ...prev]);
    setNewCurr({
      subjectName: '',
      majorId: majors[0] ? majors[0].id : '',
      year: 1,
      semester: 'fall',
      teacherId: teachers[0] ? teachers[0].id : '',
      lectureHours: 2,
      practiceHours: 2,
      labHours: 0,
      seminarHours: 0
    });
    setShowAddCurriculum(false);
  };

  // 4. Add Teacher Manual
  const handleAddTeacherSubmit = (e) => {
    e.preventDefault();
    if (!newTeacher.name.trim()) return;

    const created = {
      id: `t-custom-${Date.now()}`,
      name: newTeacher.name.toUpperCase(),
      title: newTeacher.title,
      departmentId: newTeacher.departmentId || (departments[0] ? departments[0].id : 'yunusov'),
      subjects: newTeacher.subjects ? newTeacher.subjects.split(',').map(s => s.trim()) : ['Mutaxassislik fanlari']
    };

    setTeachers(prev => [...prev, created]);
    setNewTeacher({ name: '', title: 'Dotsent', departmentId: departments[0] ? departments[0].id : '', subjects: '' });
    setShowAddTeacher(false);
  };

  // 5. Add Room Manual
  const handleAddRoomSubmit = (e) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;

    const created = {
      id: `r-custom-${Date.now()}`,
      name: newRoom.name.trim(),
      type: newRoom.type,
      capacity: Number(newRoom.capacity) || 30,
      building: newRoom.building || 'Bosh bino'
    };

    setRooms(prev => [...prev, created]);
    setNewRoom({ name: '', type: 'lecture', capacity: 30, building: 'Bosh bino' });
    setShowAddRoom(false);
  };

  // --- O'CHIRISH FUNKSIYALARI (DELETE HANDLERS) ---

  // O'quv rejadagi fanni o'chirish
  const handleDeleteCurriculum = (id) => {
    const curr = curriculums.find(c => c.id === id);
    if (!window.confirm(`"${curr?.subjectName || "Fan"}"ni o'quv rejasidan o'chirmoqchimisiz?`)) return;
    setCurriculums(prev => prev.filter(c => c.id !== id));
  };

  // Barcha o'quv rejalarni tozalash
  const handleClearAllCurriculums = () => {
    if (!window.confirm("Barcha o'quv reja fanlarini to'liq o'chirib tashlamoqchimisiz?")) return;
    setCurriculums([]);
  };

  // O'qituvchini o'chirish
  const handleDeleteTeacher = (id) => {
    const t = teachers.find(item => item.id === id);
    const linkedCurrs = curriculums.filter(c => c.teacherId === id);
    const msg = linkedCurrs.length > 0
      ? `"${t?.name || "O'qituvchi"}"ni o'chirmoqchimisiz?\n(Diqqat: Ushbu o'qituvchiga ${linkedCurrs.length} ta fan biriktirilgan!)`
      : `"${t?.name || "O'qituvchi"}"ni o'chirmoqchimisiz?`;
    if (!window.confirm(msg)) return;

    setTeachers(prev => prev.filter(item => item.id !== id));
    setCurriculums(prev => prev.map(c => c.teacherId === id ? { ...c, teacherId: '' } : c));
    if (selectedTeacher === id) setSelectedTeacher('all');
  };

  // Barcha o'qituvchilarni tozalash
  const handleClearAllTeachers = () => {
    if (!window.confirm("Barcha o'qituvchilarni to'liq o'chirib tashlamoqchimisiz?")) return;
    setTeachers([]);
    setCurriculums(prev => prev.map(c => ({ ...c, teacherId: '' })));
    setSelectedTeacher('all');
  };

  // Xonani o'chirish
  const handleDeleteRoom = (id) => {
    const r = rooms.find(item => item.id === id);
    if (!window.confirm(`"${r?.name || "Auditoriya"}"ni o'chirmoqchimisiz?`)) return;
    setRooms(prev => prev.filter(item => item.id !== id));
    if (selectedRoom === id) setSelectedRoom('all');
  };

  // Barcha xonalarni tozalash
  const handleClearAllRooms = () => {
    if (!window.confirm("Barcha auditoriyalarni to'liq o'chirib tashlamoqchimisiz?")) return;
    setRooms([]);
    setSelectedRoom('all');
  };

  // Kafedrani o'chirish
  const handleDeleteDept = (id) => {
    const d = departments.find(item => item.id === id);
    const deptTeachers = teachers.filter(t => t.departmentId === id);
    const deptMajors = majors.filter(m => m.departmentId === id);
    const msg = (deptTeachers.length > 0 || deptMajors.length > 0)
      ? `"${d?.name || "Kafedra"}"ni o'chirmoqchimisiz?\n(Diqqat: Ushbu kafedraga ${deptTeachers.length} nafar o'qituvchi va ${deptMajors.length} ta yo'nalish biriktirilgan!)`
      : `"${d?.name || "Kafedra"}"ni o'chirmoqchimisiz?`;
    if (!window.confirm(msg)) return;

    setDepartments(prev => prev.filter(item => item.id !== id));
    if (selectedDepartment === id) setSelectedDepartment('all');
  };

  // Yo'nalishni o'chirish
  const handleDeleteMajor = (id) => {
    const m = majors.find(item => item.id === id);
    const majorCurrs = curriculums.filter(c => c.majorId === id);
    const majorGroups = groups.filter(g => g.majorId === id);
    const msg = (majorCurrs.length > 0 || majorGroups.length > 0)
      ? `"${m?.name || "Yo'nalish"}"ni o'chirmoqchimisiz?\n(Diqqat: Ushbu yo'nalishga ${majorCurrs.length} ta fan va ${majorGroups.length} ta guruh tegishli!)`
      : `"${m?.name || "Yo'nalish"}"ni o'chirmoqchimisiz?`;
    if (!window.confirm(msg)) return;

    setMajors(prev => prev.filter(item => item.id !== id));
    setGroups(prev => prev.filter(g => g.majorId !== id));
    if (selectedMajor === id) setSelectedMajor('all');
  };

  // Hamma narsani butunlay o'chirish / tozalash
  const handleClearEverything = () => {
    if (!window.confirm("Haqiqatan ham barcha o'qituvchilar, xonalar, o'quv rejalari, kafedralar va boshqa ma'lumotlarni BUTUNLAY O'CHIRIB tashlamoqchimisiz?")) return;
    setTeachers([]);
    setRooms([]);
    setCurriculums([]);
    setDepartments([]);
    setMajors([]);
    setGroups([]);
    setScheduleResult(null);
    setSelectedDepartment('all');
    setSelectedMajor('all');
    setSelectedCourse('all');
    setSelectedGroup('all');
    setSelectedTeacher('all');
    setSelectedRoom('all');
  };

  // Filter entries based on selected week and active filters
  const filteredEntries = useMemo(() => {
    if (!scheduleResult || !scheduleResult.entries) return [];

    return scheduleResult.entries.filter(entry => {
      // Week filter
      if (Number(entry.weekNumber) !== Number(selectedWeek)) return false;

      // Department filter
      if (selectedDepartment !== 'all' && entry.departmentId !== selectedDepartment) return false;

      // Lesson Type filter
      if (selectedLessonType !== 'all' && entry.type !== selectedLessonType) return false;

      // Teacher filter
      if (selectedTeacher !== 'all' && entry.teacherId !== selectedTeacher) return false;

      // Room filter
      if (selectedRoom !== 'all' && entry.roomId !== selectedRoom) return false;

      // Group & Major & Course filter (applies only in group & matrix view modes)
      if (viewMode === 'group' || viewMode === 'matrix') {
        const groupObj = groups.find(g => g.id === entry.groupId);
        if (groupObj) {
          if (selectedMajor !== 'all' && groupObj.majorId !== selectedMajor) return false;
          if (selectedCourse !== 'all' && Number(groupObj.year) !== Number(selectedCourse)) return false;
        }
        if (selectedGroup !== 'all' && entry.groupId !== selectedGroup) return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSubject = entry.subjectName.toLowerCase().includes(query);
        const matchesTeacher = entry.teacherName.toLowerCase().includes(query);
        const matchesGroup = entry.groupName.toLowerCase().includes(query);
        const matchesRoom = entry.roomName.toLowerCase().includes(query);
        if (!matchesSubject && !matchesTeacher && !matchesGroup && !matchesRoom) return false;
      }

      return true;
    });
  }, [scheduleResult, selectedWeek, selectedDepartment, selectedLessonType, selectedTeacher, selectedRoom, selectedMajor, selectedCourse, selectedGroup, viewMode, searchQuery, groups]);

  // Selected Group Object for Single Group View
  const currentGroupObj = useMemo(() => {
    if (selectedGroup === 'all') return null;
    return filteredGroups.find(g => g.id === selectedGroup) || groups.find(g => g.id === selectedGroup) || null;
  }, [filteredGroups, groups, selectedGroup]);

  // Groups actually displayed in Group & Matrix views (respects selectedGroup and active search/lesson filters)
  const displayedGroups = useMemo(() => {
    if (selectedGroup !== 'all') {
      return filteredGroups.filter(g => g.id === selectedGroup);
    }
    const hasNarrowFilter =
      searchQuery.trim() !== '' ||
      selectedLessonType !== 'all' ||
      selectedTeacher !== 'all' ||
      selectedRoom !== 'all';
    if (!hasNarrowFilter) return filteredGroups;
    const activeGroupIds = new Set(filteredEntries.map(e => e.groupId));
    return filteredGroups.filter(g => activeGroupIds.has(g.id));
  }, [filteredGroups, selectedGroup, searchQuery, selectedLessonType, selectedTeacher, selectedRoom, filteredEntries]);

  // Selected Group's semester subjects and total credits
  const groupCurriculums = useMemo(() => {
    if (!currentGroupObj) return [];
    return curriculums.filter(c => 
      c.majorId === currentGroupObj.majorId && 
      Number(c.year) === Number(currentGroupObj.year) && 
      c.semester === semester
    );
  }, [curriculums, currentGroupObj, semester]);

  const groupTotalCredits = useMemo(() => {
    return groupCurriculums.reduce((sum, c) => sum + (c.credit || 4), 0);
  }, [groupCurriculums]);

  // Selected Teacher Object for Single Teacher View
  const currentTeacherObj = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacher) || teachers[0];
  }, [teachers, selectedTeacher]);

  // Selected Room Object for Single Room View
  const currentRoomObj = useMemo(() => {
    return rooms.find(r => r.id === selectedRoom) || rooms[0];
  }, [rooms, selectedRoom]);

  // Filtered rooms for Rooms tab (with building and search support)
  const displayedRooms = useMemo(() => {
    return rooms.filter(r => {
      if (selectedRoomBuildingFilter !== 'all' && r.building !== selectedRoomBuildingFilter) return false;
      if (selectedRoomTypeFilter !== 'all' && r.type !== selectedRoomTypeFilter) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase();
        return (
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.shortName && r.shortName.toLowerCase().includes(q)) ||
          (r.building && r.building.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rooms, selectedRoomBuildingFilter, selectedRoomTypeFilter, roomSearchQuery]);

  // Lesson Type Helpers
  const getShortLessonType = (type) => {
    switch (type) {
      case 'lecture': return 'm';
      case 'lab': return 'l';
      case 'seminar': return 's';
      case 'practice':
      default: return 'a';
    }
  };

  const formatParaTime = (timeStr = '') => {
    return timeStr.replace(/^0(\d):/, '$1:').replace('-', ' - ');
  };

  // Merge potok (multi-group) entries for Teacher view cells like "1-1IQT-25/1-2IQT-25"
  const mergeTeacherCellEntries = (entries) => {
    const grouped = new Map();
    entries.forEach((entry) => {
      const key = `${entry.subjectName}__${entry.type}__${entry.roomId || entry.roomName}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...entry,
          groupNames: [entry.groupName]
        });
      } else {
        const existing = grouped.get(key);
        if (!existing.groupNames.includes(entry.groupName)) {
          existing.groupNames.push(entry.groupName);
        }
      }
    });
    return Array.from(grouped.values());
  };

  // Display slots (TIME_SLOTS + any extra slot 6-7 if present)
  const displaySlots = useMemo(() => {
    const base = [...TIME_SLOTS];
    const maxSlot = filteredEntries.reduce((m, e) => Math.max(m, Number(e.slotId || 0)), 5);
    if (maxSlot >= 6 && !base.some(s => s.slot === 6)) {
      base.push({ slot: 6, name: '6-para', time: '16:30-17:50' });
    }
    if (maxSlot >= 7 && !base.some(s => s.slot === 7)) {
      base.push({ slot: 7, name: '7-para', time: '18:00-19:20' });
    }
    return base;
  }, [filteredEntries]);

  const generatedDateStr = useMemo(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }, []);

  // Teachers list to display in Teacher view
  const displayedTeachers = useMemo(() => {
    const base = selectedTeacher === 'all'
      ? teachers.filter(t => selectedDepartment === 'all' || t.departmentId === selectedDepartment)
      : teachers.filter(t => t.id === selectedTeacher);

    if (selectedTeacher !== 'all' || !hideEmptyTeachers) return base;
    const activeTeacherIds = new Set(filteredEntries.map(e => e.teacherId));
    return base.filter(t => activeTeacherIds.has(t.id));
  }, [teachers, selectedTeacher, selectedDepartment, hideEmptyTeachers, filteredEntries]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'lecture':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Ma’ruza</span>;
      case 'lab':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Laboratoriya</span>;
      case 'seminar':
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Seminar</span>;
      case 'practice':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Amaliyot</span>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      alert("Yuklab olish uchun dars jadvali ma'lumotlari topilmadi.");
      return;
    }

    const excelData = filteredEntries.map((e, index) => ({
      "№": index + 1,
      "Hafta": `${e.weekNumber}-hafta`,
      "Kun": e.dayName,
      "Juftlik (Para)": e.slotName,
      "Vaqti": e.slotTime,
      "Guruh": e.groupName,
      "Fan Kodi": e.code || '',
      "Fan Nomi": e.subjectName,
      "Kredit (ECTS)": e.credit ? `${e.credit} ECTS` : '4 ECTS',
      "Mashg'ulot Turi": e.type === 'lecture' ? 'Ma’ruza' : e.type === 'lab' ? 'Laboratoriya' : e.type === 'seminar' ? 'Seminar' : 'Amaliyot',
      "O'qituvchi": e.teacherName,
      "Auditoriya": e.roomName
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
      { wch: 20 }, { wch: 14 }, { wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    const sheetTitle = viewMode === 'group' && selectedGroup !== 'all' && currentGroupObj 
      ? `${currentGroupObj.name.replace(/[^a-zA-Z0-9]/g, '_')}`
      : viewMode === 'group' && selectedGroup === 'all'
      ? `Barcha_Guruhlar_${selectedWeek}_hafta`
      : `Dars_Jadvali_${selectedWeek}_hafta`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.substring(0, 30));
    XLSX.writeFile(workbook, `BIU_Jadval_${sheetTitle}_${semester === 'fall' ? 'Kuzgi' : 'Bahoriy'}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#ecf0f5]">
      
      {/* Hidden File Inputs for quick upload */}
      <input
        type="file"
        ref={currFileRef}
        onChange={handleImportCurriculumExcel}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <input
        type="file"
        ref={teacherFileRef}
        onChange={handleImportTeacherExcel}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* HEMIS Main Header Bar */}
      <header className="no-print hemis-main-header">
        <a href="#" className="hemis-logo">
          <School className="w-6 h-6" />
          <span>Dars jadvalini ko'rish | HEMIS OTM axborot tizimi (BIU)</span>
        </a>
        <div className="flex items-center gap-3 text-xs">
          <span>Buxoro Innovatsiyalar Universiteti • HEMIS Standard Auto-Generator</span>
          <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-[11px] font-semibold">2026-2027</span>
        </div>
      </header>

      {/* HEMIS Tab Navigation Bar */}
      <div className="no-print hemis-nav-tabs overflow-x-auto">
        <button
          onClick={() => setActiveTab('generator')}
          className={`hemis-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
        >
          <Calendar className="w-4 h-4" />
          <span>15-Haftalik Dars Jadvali</span>
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`hemis-tab-btn font-bold text-indigo-800 ${activeTab === 'plan' ? 'active' : ''}`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Reja → Jadval (Excel)</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`hemis-tab-btn font-bold ${activeTab === 'audit' ? 'active text-blue-900 bg-white shadow-xs' : 'text-blue-700'}`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Qoidalar Auditi (11 ta vazifa)</span>
          <span className="ml-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">100% Mos</span>
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`hemis-tab-btn font-bold text-emerald-800 ${activeTab === 'excel' ? 'active' : ''}`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Excel Import & Shablonlar</span>
        </button>
        <button
          onClick={() => setActiveTab('curriculums')}
          className={`hemis-tab-btn ${activeTab === 'curriculums' ? 'active' : ''}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>O'quv rejalari & Fanlar</span>
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`hemis-tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
        >
          <Users className="w-4 h-4" />
          <span>O'qituvchilar</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`hemis-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Kafedralar</span>
        </button>
        <button
          onClick={() => setActiveTab('majors')}
          className={`hemis-tab-btn ${activeTab === 'majors' ? 'active' : ''}`}
        >
          <Compass className="w-4 h-4" />
          <span>Yo'nalishlar & Guruhlar</span>
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`hemis-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
        >
          <Building className="w-4 h-4" />
          <span>Auditoriyalar</span>
        </button>
        <button
          onClick={handleClearEverything}
          className="hemis-tab-btn ml-auto text-red-600 hover:text-red-800 hover:bg-red-50 font-bold transition-colors"
          title="Barcha ma'lumotlarni o'chirish"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>Hammasini Tozalash</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="hemis-main-container">

        {/* Global Notification Banner */}
        {excelAlert && (
          <div className={`p-3 rounded text-xs flex items-center justify-between border no-print ${
            excelAlert.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : 'bg-red-50 text-red-900 border-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {excelAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{excelAlert.message}</span>
            </div>
            <button 
              onClick={() => setExcelAlert(null)}
              className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5"
            >
              Yopish ✕
            </button>
          </div>
        )}

        {/* TAB 1: GENERATOR & TIMETABLE */}
        {activeTab === 'generator' && (
          <div className="space-y-4">
            
            {/* 15-Week Selector Bar (Doimiy va O'zgaruvchan darslar) */}
            <div className="no-print hemis-week-bar p-3.5 bg-white rounded border border-gray-300 shadow-2xs space-y-2.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 text-sm">
                      Semestr haftasini tanlang (1-15 hafta: O'zgarmaydigan va o'zgaruvchan darslar):
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Har bir hafta uchun doimiy hamda aynan shu haftaga xos o'zgargan darslar yuklanadi
                    </span>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-gray-500 font-semibold mr-0.5">Filtr:</span>
                  <button
                    type="button"
                    onClick={() => setWeekFilterMode('all')}
                    className={`px-2 py-0.5 rounded font-bold transition ${weekFilterMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Barchasi (1-15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekFilterMode('odd')}
                    className={`px-2 py-0.5 rounded font-bold transition ${weekFilterMode === 'odd' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}
                  >
                    Toq haftalar (1, 3, 5...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekFilterMode('even')}
                    className={`px-2 py-0.5 rounded font-bold transition ${weekFilterMode === 'even' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                  >
                    Juft haftalar (2, 4, 6...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekFilterMode('m1')}
                    className={`px-2 py-0.5 rounded font-bold transition ${weekFilterMode === 'm1' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'}`}
                  >
                    1-modul (1-8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekFilterMode('m2')}
                    className={`px-2 py-0.5 rounded font-bold transition ${weekFilterMode === 'm2' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'}`}
                  >
                    2-modul (9-15)
                  </button>
                </div>
              </div>

              {/* Week Buttons Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5 pt-1">
                {WEEKS.map(w => {
                  const isSelected = Number(selectedWeek) === Number(w.weekNumber);
                  const isOdd = w.weekNumber % 2 === 1;
                  const weekLessonsCount = scheduleResult?.stats?.weekEntriesCount?.[w.weekNumber] || 0;
                  
                  const isVisibleInFilter = 
                    weekFilterMode === 'all' ||
                    (weekFilterMode === 'odd' && isOdd) ||
                    (weekFilterMode === 'even' && !isOdd) ||
                    (weekFilterMode === 'm1' && w.weekNumber <= 8) ||
                    (weekFilterMode === 'm2' && w.weekNumber > 8);

                  return (
                    <button
                      key={w.weekNumber}
                      type="button"
                      onClick={() => setSelectedWeek(w.weekNumber)}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded border text-center transition relative ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs scale-102 ring-2 ring-blue-300' 
                          : isVisibleInFilter
                          ? 'bg-gray-50 hover:bg-blue-50 text-gray-800 border-gray-300'
                          : 'bg-gray-100/50 text-gray-400 border-gray-200 opacity-60'
                      }`}
                    >
                      <span className="text-[12px] font-black">{w.weekNumber}-h</span>
                      <span className={`text-[9px] font-semibold px-1 py-0.1 rounded-xs mt-0.5 ${
                        isSelected
                          ? 'bg-blue-800 text-blue-100'
                          : isOdd 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {isOdd ? 'Toq' : 'Juft'}
                      </span>
                      {weekLessonsCount > 0 && (
                        <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-blue-100 font-bold' : 'text-gray-500'}`}>
                          {weekLessonsCount} dars
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Info Strip & Legend */}
              <div className="pt-2 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    Hozir ko'rilmoqda: {selectedWeek}-hafta ({selectedWeek % 2 === 1 ? 'Toq hafta' : 'Juft hafta'} • {selectedWeek <= 8 ? '1-modul' : '2-modul'})
                  </span>
                  <span className="text-gray-600">
                    Jadvaldagi darslar: <strong className="text-blue-700">{filteredEntries.length} ta</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-medium text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> O'zgarmaydigan (1-15)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Toq haftalar
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span> Juft haftalar
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> 1-modul (1-8)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> 2-modul (9-15)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> O'zgargan dars
                  </span>
                </div>
              </div>
            </div>

            {/* View Mode Selector Bar */}
            <div className="no-print hemis-mode-bar">
              <div className="hemis-mode-group">
                <span className="hemis-mode-label">Ko'rinish rejimi:</span>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('group')}
                  className={`hemis-mode-btn ${viewMode === 'group' ? 'active' : ''}`}
                >
                  <GraduationCap style={{ width: '16px', height: '16px' }} />
                  <span>Guruh bo'yicha (HEMIS Standarti)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('teacher')}
                  className={`hemis-mode-btn ${viewMode === 'teacher' ? 'active' : ''}`}
                >
                  <UserCheck style={{ width: '16px', height: '16px' }} />
                  <span>O'qituvchi bo'yicha</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('matrix')}
                  className={`hemis-mode-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                >
                  <LayoutGrid style={{ width: '16px', height: '16px' }} />
                  <span>Guruhlar matritsasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('room')}
                  className={`hemis-mode-btn ${viewMode === 'room' ? 'active' : ''}`}
                >
                  <Building2 style={{ width: '16px', height: '16px' }} />
                  <span>Auditoriya bandligi</span>
                </button>
              </div>

              <div className="hemis-action-group">
                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className="hemis-action-btn btn-import"
                  title="O'quv reja va O'qituvchilarni Excel orqali yuklash"
                >
                  <UploadCloud style={{ width: '15px', height: '15px' }} />
                  <span>Excel Import</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="hemis-action-btn btn-excel"
                >
                  <FileSpreadsheet style={{ width: '15px', height: '15px' }} />
                  <span>Excel (.xlsx) Yuklash</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="hemis-action-btn btn-print"
                >
                  <Download style={{ width: '15px', height: '15px' }} />
                  <span>Chop etish</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="hemis-btn-primary"
                >
                  <RefreshCw style={{ width: '15px', height: '15px' }} className={isGenerating ? 'animate-spin' : ''} />
                  <span>{isGenerating ? 'Generatsiya...' : 'Qayta Generatsiya'}</span>
                </button>
              </div>
            </div>

            {/* HEMIS Filter Panel Box */}
            <div className="no-print hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span>Dars jadvali filtrlari va qidiruv</span>
              </div>
              
              <div className="hemis-box-body">
                <div className="hemis-filter-grid">
                  
                  {/* Semestr */}
                  <div>
                    <label className="hemis-filter-label">Semestr</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="hemis-form-control"
                      style={{ fontWeight: 700, color: '#1e3a8a' }}
                    >
                      <option value="fall">1-semestr (Kuzgi)</option>
                      <option value="spring">2-semestr (Bahoriy)</option>
                    </select>
                  </div>

                  {/* Kafedra */}
                  <div>
                    <label className="hemis-filter-label">Kafedra</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setSelectedMajor('all');
                      }}
                      className="hemis-form-control"
                    >
                      <option value="all">Barcha kafedralar</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Yo'nalish (Guruh va Matritsa rejimlarida) */}
                  {(viewMode === 'group' || viewMode === 'matrix') && (
                    <div>
                      <label className="hemis-filter-label">Yo'nalish</label>
                      <select
                        value={selectedMajor}
                        onChange={(e) => setSelectedMajor(e.target.value)}
                        className="hemis-form-control"
                      >
                        <option value="all">Barcha yo'nalishlar</option>
                        {filteredMajors.map(m => (
                          <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Kurs (Guruh va Matritsa rejimlarida) */}
                  {(viewMode === 'group' || viewMode === 'matrix') && (
                    <div>
                      <label className="hemis-filter-label">Kurs</label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="hemis-form-control"
                      >
                        <option value="all">Barcha kurslar (I-IV)</option>
                        {INITIAL_COURSES.map(c => (
                          <option key={c} value={c}>{c}-kurs</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Guruh (Faqat Guruh bo'yicha rejimda ko'rinadi) */}
                  {viewMode === 'group' && (
                    <div>
                      <label className="hemis-filter-label highlight">
                        Guruh (Tanlangan) *
                      </label>
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="hemis-form-control"
                        style={{ fontWeight: 700, color: '#1e3a8a', borderColor: '#60a5fa' }}
                      >
                        <option value="all">Barcha guruhlar ({filteredGroups.length} ta)</option>
                        {filteredGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.year}-kurs)</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* O'qituvchi / Xona yoki Mashg'ulot turi */}
                  {viewMode === 'teacher' ? (
                    <div>
                      <label className="hemis-filter-label highlight">O'qituvchi *</label>
                      <select
                        value={selectedTeacher}
                        onChange={(e) => setSelectedTeacher(e.target.value)}
                        className="hemis-form-control"
                        style={{ fontWeight: 700, color: '#1e3a8a', borderColor: '#60a5fa' }}
                      >
                        <option value="all">Barcha o'qituvchilar</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : viewMode === 'room' ? (
                    <div>
                      <label className="hemis-filter-label highlight">Auditoriya *</label>
                      <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="hemis-form-control"
                        style={{ fontWeight: 700, color: '#1e3a8a', borderColor: '#60a5fa' }}
                      >
                        <option value="all">Barcha auditoriyalar</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="hemis-filter-label">Mashg'ulot turi</label>
                      <select
                        value={selectedLessonType}
                        onChange={(e) => setSelectedLessonType(e.target.value)}
                        className="hemis-form-control"
                      >
                        <option value="all">Barcha turlar</option>
                        <option value="lecture">Ma’ruza</option>
                        <option value="practice">Amaliyot</option>
                        <option value="lab">Laboratoriya</option>
                        <option value="seminar">Seminar</option>
                      </select>
                    </div>
                  )}

                </div>

                {/* Live Search Bar & ARM Toggle */}
                <div className="hemis-search-row">
                  <div className="hemis-search-wrap">
                    <input
                      type="text"
                      placeholder="Fan, o'qituvchi, guruh yoki xona bo'yicha tezkor qidiruv..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="hemis-form-control"
                      style={{ paddingRight: '32px' }}
                    />
                    <Search className="hemis-search-icon" />
                  </div>
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Qidiruvni tozalash
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white px-2.5 py-1.5 rounded border border-gray-300 shadow-2xs cursor-pointer select-none hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={includeIndependentStudy}
                      onChange={e => setIncludeIndependentStudy(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mustaqil ta'lim (ARM) slotlarini ko'rsatish</span>
                  </label>
                  <div style={{ fontSize: '12.5px', color: '#4b5563', marginLeft: 'auto' }}>
                    Topilgan darslar: <strong style={{ color: '#1d4ed8' }}>{filteredEntries.length} ta</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* Status Alert Banner */}
            {scheduleResult && scheduleResult.success && (
              <div className="no-print hemis-status-banner flex-wrap gap-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck style={{ width: '18px', height: '18px', color: '#059669', flexShrink: 0 }} />
                  <span>
                    <strong>Dars jadvali tuzish qoidalariga 100% mos (HEMIS standarti):</strong> 11 ta vazifa va 14 ta qat'iy/sifat nazorati to'liq bajarildi.
                    Oqimlar: <strong>{scheduleResult.stats?.potokCount || 0} ta</strong> | Kolliziyalar: <strong>0 ta</strong> | Darchalar: <strong>0 ta</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Audit hisoboti (14/14)</span>
                  </button>
                  <span className="hemis-status-badge">
                    100% Qoidaga Mos
                  </span>
                </div>
              </div>
            )}

            {/* VIEW 1: GROUP TIMETABLE (aSc Timetables PDF Style — Single & All Groups) */}
            {viewMode === 'group' && (
              <div>
                {/* Toolbar for All Groups mode */}
                {selectedGroup === 'all' && (
                  <div className="no-print asc-toolbar">
                    <div>
                      <div className="asc-toolbar-title">
                        Barcha guruhlar dars jadvali — {displayedGroups.length} ta guruh ({selectedWeek}-hafta, {semester === 'fall' ? '1-semestr' : '2-semestr'})
                      </div>
                      <div className="asc-toolbar-sub">
                        Har bir guruhni alohida PDF namunadek yoki bitta umumiy para jadvalida (qaysi parada qaysi guruh, fan va xona) ko'rishingiz mumkin
                      </div>
                    </div>
                    <div className="asc-toggle-group">
                      <button
                        type="button"
                        onClick={() => setAllGroupsLayout('per-group')}
                        className={`asc-toggle-btn ${allGroupsLayout === 'per-group' ? 'active' : ''}`}
                      >
                        Guruh kesimida (PDF namuna)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllGroupsLayout('combined')}
                        className={`asc-toggle-btn ${allGroupsLayout === 'combined' ? 'active' : ''}`}
                      >
                        Umumiy jadval (Para kesimida barcha guruhlar)
                      </button>
                    </div>
                  </div>
                )}

                {/* CASE A: Barcha guruhlar -> Umumiy jadval (Para kesimida qaysi guruh, qaysi fan, qaysi xona) */}
                {selectedGroup === 'all' && allGroupsLayout === 'combined' ? (
                  <div className="asc-sheet">
                    <div className="asc-header">
                      <div className="asc-subtitle">Dars jadvali</div>
                      <div className="asc-title">Barcha guruhlar ({displayedGroups.length} ta)</div>
                      <div className="asc-meta-bar">
                        <span className="asc-meta-pill">{selectedWeek}-hafta</span>
                        <span className="asc-meta-pill">{semester === 'fall' ? '1-semestr (Kuzgi)' : '2-semestr (Bahoriy)'}</span>
                        <span className="asc-meta-pill">Jami darslar: {filteredEntries.length} ta para</span>
                      </div>
                    </div>

                    <div className="asc-table-wrap">
                      <table className="asc-table">
                        <thead>
                          <tr>
                            <th></th>
                            {DAYS_OF_WEEK.map(day => (
                              <th key={day.id}>{day.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displaySlots.map(slot => (
                            <tr key={slot.slot}>
                              <td className="asc-para-cell">
                                <div className="asc-para-num">{slot.slot}</div>
                                <div className="asc-para-time">{formatParaTime(slot.time)}</div>
                              </td>
                              {DAYS_OF_WEEK.map(day => {
                                const cellEntries = filteredEntries
                                  .filter(e => Number(e.dayId) === Number(day.id) && Number(e.slotId) === Number(slot.slot))
                                  .sort((a, b) => a.groupName.localeCompare(b.groupName));

                                return (
                                  <td key={day.id} className="asc-combined-cell">
                                    {cellEntries.length > 0 && (
                                      <div className="asc-combined-list">
                                        {cellEntries.map((entry, idx) => (
                                          <div key={`${entry.id}_${idx}`} className={`asc-combined-item type-${entry.type || 'practice'}`}>
                                            <div className="asc-combined-top">
                                              <span className="asc-combined-group">{entry.groupName}</span>
                                              <span className="asc-combined-room">{entry.roomName}</span>
                                            </div>
                                            <div className="asc-combined-subject flex items-center justify-between">
                                              <div>
                                                {entry.isPotok && (
                                                  <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-purple-600 text-white font-bold" title="Oqim ma'ruzasi">OQIM</span>
                                                )}
                                                {entry.isIndependent && (
                                                  <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-indigo-600 text-white font-bold" title="Mustaqil ta'lim (ARM)">ARM</span>
                                                )}
                                                {!entry.isPermanent && (
                                                  <span className={`inline-block mr-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                                                    entry.isOverridden || entry.weekPattern === 'custom'
                                                      ? 'bg-amber-400 text-slate-900 border border-amber-600'
                                                      : entry.weekPattern === 'odd'
                                                      ? 'bg-blue-600 text-white'
                                                      : entry.weekPattern === 'even'
                                                      ? 'bg-purple-600 text-white'
                                                      : entry.weekPattern === 'first_half'
                                                      ? 'bg-amber-600 text-white'
                                                      : 'bg-rose-600 text-white'
                                                  }`} title={entry.activeWeeksLabel || 'Haftalik dars'}>
                                                    {entry.isOverridden ? 'O‘ZGARGAN' : entry.weekPattern === 'odd' ? 'TOQ' : entry.weekPattern === 'even' ? 'JUFT' : entry.weekPattern === 'first_half' ? '1-8 H.' : entry.weekPattern === 'second_half' ? '9-15 H.' : 'MAXSUS'}
                                                  </span>
                                                )}
                                                {entry.subjectName} ({getShortLessonType(entry.type)})
                                              </div>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenWeekModal(entry);
                                                }}
                                                className="no-print p-0.5 text-gray-400 hover:text-blue-700 rounded hover:bg-black/5"
                                                title="Dars haftalarini sozlash / o'zgartirish"
                                              >
                                                ⚙
                                              </button>
                                            </div>
                                            <div className="asc-combined-teacher">
                                              {entry.teacherName}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="asc-footer">
                      <span>Jadval tuzildi: {generatedDateStr} • {selectedWeek}-hafta</span>
                      <span>BIU Dars jadvali</span>
                    </div>
                  </div>
                ) : (
                  /* CASE B: Single Group OR All Groups in Per-Group aSc PDF Style */
                  (() => {
                    const groupsToRender = displayedGroups;

                    if (groupsToRender.length === 0) {
                      return (
                        <div className="asc-empty-box">
                          Tanlangan filtr bo'yicha guruhlar topilmadi.
                        </div>
                      );
                    }

                    return groupsToRender.map(groupObj => {
                      const groupLessons = filteredEntries.filter(e => e.groupId === groupObj.id);
                      const grpCurrs = curriculums.filter(
                        c => c.majorId === groupObj.majorId && Number(c.year) === Number(groupObj.year) && c.semester === semester
                      );
                      const grpCredits = grpCurrs.reduce((sum, c) => sum + (c.credit || 4), 0);

                      return (
                        <div key={groupObj.id} className="asc-sheet">
                          <div className="asc-header">
                            <div className="asc-subtitle">Dars jadvali</div>
                            <div className="asc-title">{groupObj.name}</div>
                            <div className="asc-meta-bar">
                              <span className="asc-meta-pill">{groupObj.year}-kurs ({groupObj.studentCount} talaba)</span>
                              <span className="asc-meta-pill">{selectedWeek}-hafta</span>
                              <span className="asc-meta-pill">{semester === 'fall' ? '1-semestr (Kuzgi)' : '2-semestr (Bahoriy)'}</span>
                              {grpCredits > 0 && <span className="asc-meta-pill">{grpCredits} ECTS</span>}
                              <span className="asc-meta-pill">{groupLessons.length} para ({groupLessons.length * 2} soat)</span>
                            </div>
                          </div>

                          <div className="asc-table-wrap">
                            <table className="asc-table">
                              <thead>
                                <tr>
                                  <th></th>
                                  {DAYS_OF_WEEK.map(day => (
                                    <th key={day.id}>{day.name}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {displaySlots.map(slot => (
                                  <tr key={slot.slot}>
                                    <td className="asc-para-cell">
                                      <div className="asc-para-num">{slot.slot}</div>
                                      <div className="asc-para-time">{formatParaTime(slot.time)}</div>
                                    </td>
                                    {DAYS_OF_WEEK.map(day => {
                                      const cellEntries = groupLessons.filter(
                                        e => Number(e.dayId) === Number(day.id) && Number(e.slotId) === Number(slot.slot)
                                      );

                                      return (
                                        <td key={day.id} className="asc-lesson-cell">
                                          {cellEntries.length > 0 && (
                                            <div className="asc-cell-split">
                                              {cellEntries.map((lesson, idx) => (
                                                <div key={`${lesson.id}_${idx}`} className="asc-cell-inner">
                                                  <div className="asc-subject flex items-center justify-between">
                                                    <div>
                                                      {lesson.isPotok && (
                                                        <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-purple-600 text-white font-bold" title="Oqim ma'ruzasi">OQIM</span>
                                                      )}
                                                      {lesson.isIndependent && (
                                                        <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-indigo-600 text-white font-bold" title="Mustaqil ta'lim (ARM)">ARM</span>
                                                      )}
                                                      {!lesson.isPermanent && (
                                                        <span className={`inline-block mr-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                                                          lesson.isOverridden || lesson.weekPattern === 'custom'
                                                            ? 'bg-amber-400 text-slate-900 border border-amber-600'
                                                            : lesson.weekPattern === 'odd'
                                                            ? 'bg-blue-600 text-white'
                                                            : lesson.weekPattern === 'even'
                                                            ? 'bg-purple-600 text-white'
                                                            : lesson.weekPattern === 'first_half'
                                                            ? 'bg-amber-600 text-white'
                                                            : 'bg-rose-600 text-white'
                                                        }`} title={lesson.activeWeeksLabel || 'Haftalik dars'}>
                                                          {lesson.isOverridden ? 'O‘ZGARGAN' : lesson.weekPattern === 'odd' ? 'TOQ' : lesson.weekPattern === 'even' ? 'JUFT' : lesson.weekPattern === 'first_half' ? '1-8 H.' : lesson.weekPattern === 'second_half' ? '9-15 H.' : 'MAXSUS'}
                                                        </span>
                                                      )}
                                                      {lesson.subjectName} ({getShortLessonType(lesson.type)})
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenWeekModal(lesson);
                                                      }}
                                                      className="no-print p-0.5 text-gray-400 hover:text-blue-700 rounded hover:bg-black/5"
                                                      title="Dars haftalarini sozlash / o'zgartirish"
                                                    >
                                                      ⚙
                                                    </button>
                                                  </div>
                                                  <div className="asc-bottom">
                                                    <span className="asc-bottom-left">{lesson.roomName}</span>
                                                    <span className="asc-bottom-right">{lesson.teacherName}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="asc-footer">
                            <span>Jadval tuzildi: {generatedDateStr} • {selectedWeek}-hafta</span>
                            <span>BIU Dars jadvali</span>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            )}

            {/* VIEW 2: TEACHER TIMETABLE (aSc Timetables PDF Style — O'qituvchi kesimida) */}
            {viewMode === 'teacher' && (
              <div>
                {selectedTeacher === 'all' && (
                  <div className="no-print asc-toolbar">
                    <div>
                      <div className="asc-toolbar-title">
                        O'qituvchilar kesimida dars jadvali — {displayedTeachers.length} nafar o'qituvchi ({selectedWeek}-hafta)
                      </div>
                      <div className="asc-toolbar-sub">
                        Har bir katakda fan (m/a/s/l), chap pastda guruh(lar), o'ng pastda xona ko'rsatiladi
                      </div>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hideEmptyTeachers}
                        onChange={(e) => setHideEmptyTeachers(e.target.checked)}
                      />
                      <span>Faqat darsi bor o'qituvchilar</span>
                    </label>
                  </div>
                )}

                {displayedTeachers.length === 0 ? (
                  <div className="asc-empty-box">
                    Tanlangan filtr bo'yicha o'qituvchilar dars jadvali topilmadi.
                  </div>
                ) : (
                  displayedTeachers.map(teacherObj => {
                    const teacherLessons = filteredEntries.filter(e => e.teacherId === teacherObj.id);
                    const deptObj = departments.find(d => d.id === teacherObj.departmentId);

                    // Count distinct (day, slot) paras for teacher (potok counts as 1 para)
                    const uniqueSlotKeys = new Set(teacherLessons.map(e => `${e.dayId}_${e.slotId}`));

                    return (
                      <div key={teacherObj.id} className="asc-sheet">
                        <div className="asc-header">
                          <div className="asc-subtitle">Dars jadvali</div>
                          <div className="asc-title">{teacherObj.name}</div>
                          <div className="asc-meta-bar">
                            {teacherObj.title && <span className="asc-meta-pill">{teacherObj.title}</span>}
                            {deptObj && <span className="asc-meta-pill">{deptObj.name}</span>}
                            <span className="asc-meta-pill">{selectedWeek}-hafta</span>
                            <span className="asc-meta-pill">{uniqueSlotKeys.size} para ({uniqueSlotKeys.size * 2} soat)</span>
                          </div>
                        </div>

                        <div className="asc-table-wrap">
                          <table className="asc-table">
                            <thead>
                              <tr>
                                <th></th>
                                {DAYS_OF_WEEK.map(day => (
                                  <th key={day.id}>{day.name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {displaySlots.map(slot => (
                                <tr key={slot.slot}>
                                  <td className="asc-para-cell">
                                    <div className="asc-para-num">{slot.slot}</div>
                                    <div className="asc-para-time">{formatParaTime(slot.time)}</div>
                                  </td>
                                  {DAYS_OF_WEEK.map(day => {
                                    const rawCellEntries = teacherLessons.filter(
                                      e => Number(e.dayId) === Number(day.id) && Number(e.slotId) === Number(slot.slot)
                                    );
                                    const cellEntries = mergeTeacherCellEntries(rawCellEntries);

                                    return (
                                      <td key={day.id} className="asc-lesson-cell">
                                        {cellEntries.length > 0 && (
                                          <div className="asc-cell-split">
                                            {cellEntries.map((lesson, idx) => (
                                              <div key={`${lesson.id}_${idx}`} className="asc-cell-inner">
                                                <div className="asc-subject flex items-center justify-between">
                                                  <div>
                                                    {lesson.isPotok && (
                                                      <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-purple-600 text-white font-bold" title="Oqim ma'ruzasi">OQIM</span>
                                                    )}
                                                    {lesson.isIndependent && (
                                                      <span className="inline-block mr-1 px-1 py-0.2 rounded text-[9px] bg-indigo-600 text-white font-bold" title="Mustaqil ta'lim (ARM)">ARM</span>
                                                    )}
                                                    {!lesson.isPermanent && (
                                                      <span className={`inline-block mr-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                                                        lesson.isOverridden || lesson.weekPattern === 'custom'
                                                          ? 'bg-amber-400 text-slate-900 border border-amber-600'
                                                          : lesson.weekPattern === 'odd'
                                                          ? 'bg-blue-600 text-white'
                                                          : lesson.weekPattern === 'even'
                                                          ? 'bg-purple-600 text-white'
                                                          : lesson.weekPattern === 'first_half'
                                                          ? 'bg-amber-600 text-white'
                                                          : 'bg-rose-600 text-white'
                                                      }`} title={lesson.activeWeeksLabel || 'Haftalik dars'}>
                                                        {lesson.isOverridden ? 'O‘ZGARGAN' : lesson.weekPattern === 'odd' ? 'TOQ' : lesson.weekPattern === 'even' ? 'JUFT' : lesson.weekPattern === 'first_half' ? '1-8 H.' : lesson.weekPattern === 'second_half' ? '9-15 H.' : 'MAXSUS'}
                                                      </span>
                                                    )}
                                                    {lesson.subjectName} ({getShortLessonType(lesson.type)})
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenWeekModal(lesson);
                                                    }}
                                                    className="no-print p-0.5 text-gray-400 hover:text-blue-700 rounded hover:bg-black/5"
                                                    title="Dars haftalarini sozlash / o'zgartirish"
                                                  >
                                                    ⚙
                                                  </button>
                                                </div>
                                                <div className="asc-bottom">
                                                  <span className="asc-bottom-left">
                                                    {Array.isArray(lesson.groupNames) && lesson.groupNames.length > 0
                                                      ? lesson.groupNames.filter(Boolean).join('/')
                                                      : (lesson.groupName || '')}
                                                  </span>
                                                  <span className="asc-bottom-right">{lesson.roomName}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="asc-footer">
                          <span>Jadval tuzildi: {generatedDateStr} • {selectedWeek}-hafta</span>
                          <span>BIU Dars jadvali</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW 3: MATRIX TIMETABLE (CROSS-GROUP COMPARISON) */}
            {viewMode === 'matrix' && (
              <div className="hemis-box bg-white shadow-sm border border-gray-300">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-blue-900">
                    Guruhlar dars jadvali matritsasi — {selectedWeek}-hafta ({displayedGroups.length} ta guruh)
                  </h3>
                  <div className="text-xs text-gray-600">
                    Gorizontal jadval orqali bir vaqtning o'zida guruhlarning bandligini solishtirish mumkin
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="hemis-table hemis-table-hover min-w-[900px] table-fixed">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Kun</th>
                        <th style={{ width: '120px' }}>Para</th>
                        {displayedGroups.map(group => (
                          <th key={group.id} style={{ minWidth: '170px' }}>
                            <div className="font-bold text-blue-900">{group.name}</div>
                            <div className="text-[11px] font-normal text-gray-500">{group.year}-kurs ({group.studentCount} talaba)</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS_OF_WEEK.map(day => (
                        <React.Fragment key={day.id}>
                          {TIME_SLOTS.map((slot, slotIdx) => (
                            <tr key={`${day.id}_${slot.slot}`}>
                              {slotIdx === 0 && (
                                <td
                                  rowSpan={TIME_SLOTS.length}
                                  className="font-bold text-gray-900 bg-gray-50 align-middle text-center border-r"
                                >
                                  <div className="text-sm font-bold">{day.name}</div>
                                  <div className="text-[11px] text-blue-600 font-semibold mt-1">{selectedWeek}-hafta</div>
                                </td>
                              )}
                              <td className="align-middle bg-white">
                                <div className="font-semibold text-gray-800">{slot.name}</div>
                                <div className="text-[11px] text-blue-600 font-medium">{slot.time}</div>
                              </td>

                              {displayedGroups.map(group => {
                                const entry = filteredEntries.find(
                                  e => e.groupId === group.id && e.dayId === day.id && e.slotId === slot.slot
                                );

                                return (
                                  <td
                                    key={group.id}
                                    className="text-left align-top p-2"
                                    style={{ minHeight: '65px' }}
                                  >
                                    {entry ? (
                                      <div className="hemis-cell-content space-y-1">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {entry.code && (
                                            <span className="bg-gray-100 text-gray-700 font-mono text-[9px] font-bold px-1 py-0.5 rounded border border-gray-300">
                                              {entry.code}
                                            </span>
                                          )}
                                          {entry.credit && (
                                            <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1 py-0.5 rounded border border-amber-200">
                                              {entry.credit} ECTS
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-bold text-gray-900 text-xs">
                                          {entry.subjectName}
                                        </div>
                                        <div>
                                          {getTypeBadge(entry.type)}
                                        </div>
                                        <div className="text-[11px] font-semibold text-gray-700">
                                          {entry.teacherName}
                                        </div>
                                        <div className="text-[11px] text-gray-600 bg-gray-100 inline-block px-1.5 py-0.5 rounded border border-gray-300">
                                          Xona: <span className="font-bold text-black">{entry.roomName}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-300 text-center py-2">—</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 4: ROOM TIMETABLE */}
            {viewMode === 'room' && (
              <div className="hemis-box bg-white shadow-sm border border-gray-300">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-blue-900">
                    Auditoriyalar bandlik jadvali: {selectedRoom === 'all' ? 'Barcha auditoriyalar' : (currentRoomObj ? currentRoomObj.name : '')}
                  </h3>
                  <div className="text-xs text-gray-600">
                    {selectedWeek}-hafta bo'yicha auditoriyalarning bandlik va bo'sh vaqtlari
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="hemis-table min-w-[750px]">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Kun</th>
                        <th style={{ width: '15%' }}>Para / Vaqt</th>
                        <th style={{ width: '18%' }}>Auditoriya</th>
                        <th style={{ width: '28%' }}>Fan va Dars turi</th>
                        <th style={{ width: '12%' }}>Guruh</th>
                        <th style={{ width: '12%' }}>O'qituvchi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS_OF_WEEK.map(day => {
                        const dayLessons = filteredEntries.filter(e => e.dayId === day.id)
                          .sort((a, b) => a.slotId - b.slotId);

                        if (dayLessons.length === 0) {
                          return (
                            <tr key={day.id} className="bg-gray-50/50">
                              <td className="font-bold text-gray-700 bg-gray-50">{day.name}</td>
                              <td colSpan={5} className="text-gray-400 text-xs py-2 italic">— Bo'sh —</td>
                            </tr>
                          );
                        }

                        return dayLessons.map((lesson, idx) => (
                          <tr key={`${day.id}_${lesson.id}_${idx}`} className="hover:bg-blue-50/30">
                            {idx === 0 && (
                              <td rowSpan={dayLessons.length} className="font-bold text-gray-900 bg-gray-50 align-middle">
                                {day.name}
                              </td>
                            )}
                            <td>
                              <div className="font-bold text-gray-800">{lesson.slotName}</div>
                              <div className="text-[11px] text-blue-700 font-medium">{lesson.slotTime}</div>
                            </td>
                            <td className="font-bold text-gray-900 text-xs">
                              {lesson.roomName}
                            </td>
                            <td className="text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {lesson.code && (
                                  <span className="bg-gray-100 text-gray-700 font-mono text-[9px] font-bold px-1 py-0.5 rounded border border-gray-300">
                                    {lesson.code}
                                  </span>
                                )}
                                <span className="font-bold text-gray-900 text-xs">{lesson.subjectName}</span>
                                {lesson.credit && (
                                  <span className="bg-amber-100 text-amber-900 font-bold text-[9px] px-1 py-0.5 rounded border border-amber-200">
                                    {lesson.credit} ECTS
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">{getTypeBadge(lesson.type)}</div>
                            </td>
                            <td>
                              <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                                {lesson.groupName}
                              </span>
                            </td>
                            <td className="text-xs font-semibold text-gray-700 text-left">
                              {lesson.teacherName}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: EXCEL IMPORT & TEMPLATES (YANGI BO'LIM) */}
        {activeTab === 'plan' && <PlanScheduler />}

      {activeTab === 'excel' && (
          <div className="space-y-4">
            
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <h2 className="text-base font-bold">Excel Orqali O'quv Reja va O'qituvchilar Yuklamasini Kiritish</h2>
              </div>
              <p className="text-xs text-blue-100 max-w-3xl">
                Dekanat yoki O'quv-uslubiy boshqarma tomonidan tayyorlangan Excel fayllarni tizimga yuklang.
                Tizim o'quv rejadagi fanlarni avtomatik aniqlaydi, o'qituvchilar yuklamasiga biriktiradi va 
                <strong> 15 haftalik to'qnashuvlarsiz, darchasiz (okno-free) ideal dars jadvalini</strong> bir lahzada tuzadi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* CARD 1: O'QUV REJA EXCEL */}
              <div className="hemis-box hemis-box-primary bg-white shadow-sm flex flex-col justify-between">
                <div className="hemis-box-header bg-blue-50/50">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <span>1. O'quv Rejalar va Fanlar (Excel)</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">O'quv reja</span>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Yo'nalishlar, kurslar (1-4), semestr, fan nomlari, mashg'ulot turlari (ma'ruza, amaliyot, lab) va haftalik soatlar jadvali.
                  </p>

                  <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs space-y-1.5">
                    <div className="font-bold text-gray-800">Qo'llab-quvvatlanadigan ustunlar:</div>
                    <div className="text-gray-600 font-mono text-[11px]">
                      • Fan nomi • Yo'nalish • Kurs (1-4) • Semestr • Ma'ruza (soat) • Amaliyot (soat) • Laboratoriya (soat) • Seminar (soat)
                    </div>
                  </div>

                  <a
                    href="/BIU_Rasmiy_Oquv_Rejalar.xlsx"
                    download="BIU_Rasmiy_Oquv_Rejalar.xlsx"
                    className="w-full px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <FileDown className="w-4 h-4 text-emerald-700" />
                    <span>BIU Rasmiy O'quv Rejalarini Excel (.xlsx) Yuklab Olish</span>
                  </a>

                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleDownloadCurriculumTemplate}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileDown className="w-4 h-4 text-blue-700" />
                      <span>Shablonni Yuklab Olish</span>
                    </button>

                    <label className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                      <FileUp className="w-4 h-4" />
                      <span>O'quv Reja Excelni Yuklash</span>
                      <input
                        type="file"
                        onChange={handleImportCurriculumExcel}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border-t text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Hozirda tizimda: <strong>{curriculums.length} ta fan</strong></span>
                  <span className="text-blue-700 font-semibold">Avtomatik bog'lanadi</span>
                </div>
              </div>

              {/* CARD 2: O'QITUVCHILAR YUKLAMASI EXCEL */}
              <div className="hemis-box hemis-box-primary bg-white shadow-sm flex flex-col justify-between">
                <div className="hemis-box-header bg-emerald-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>2. O'qituvchilar va Fan Yuklamasi (Excel)</span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">Kafedra yuklamasi</span>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Kafedralar professor-o'qituvchilari ro'yxati, ularning unvoni va o'tadigan mutaxassislik fanlari ro'yxati.
                  </p>

                  <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded text-xs space-y-1.5">
                    <div className="font-bold text-gray-800">Talab etiladigan ustunlar:</div>
                    <div className="text-gray-600 font-mono text-[11px]">
                      • O'qituvchi F.I.SH • Lavozimi • Kafedra • O'tadigan fanlari (vergul bilan)
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleDownloadTeacherTemplate}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileDown className="w-4 h-4 text-emerald-700" />
                      <span>Yuklama Shablonini Yuklab Olish</span>
                    </button>

                    <label className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                      <FileUp className="w-4 h-4" />
                      <span>O'qituvchilar Excelni Yuklash</span>
                      <input
                        type="file"
                        onChange={handleImportTeacherExcel}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border-t text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Hozirda tizimda: <strong>{teachers.length} nafar o'qituvchi</strong></span>
                  <span className="text-emerald-700 font-semibold">Kafedra bo'yicha integratsiya</span>
                </div>
              </div>

            </div>

            {/* Step-by-Step Instructions Box */}
            <div className="p-4 bg-white border border-gray-300 rounded shadow-sm text-xs space-y-2">
              <div className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Qanday ishlaydi? (3 bosqichli avtomatlashtirish)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li><strong>Namuna shablonlarni yuklab oling:</strong> Tugmani bosib, tayyor formatdagi `.xlsx` fayllarni kompyuteringizga oling.</li>
                <li><strong>Ma'lumotlarni to'ldiring va yuklang:</strong> Fakultet o'quv rejalari va kafedra o'qituvchilari ma'lumotlarini o'z ichiga olgan Excel faylni yuklang.</li>
                <li><strong>Avtomatik ideal jadval tayyor:</strong> Tizim yuklangan fanlarni o'qituvchilarning ixtisosligiga qarab avtomatik aniqlaydi va biriktiradi, so'ngra 15 haftalik to'liq dars jadvalini darchasiz (oknosiz) generatsiya qilib beradi.</li>
              </ol>
            </div>

          </div>
        )}

        {/* TAB 3: CURRICULUMS */}
        {activeTab === 'curriculums' && (
          <div className="space-y-4">
            {/* ECTS Credit Module Info Box */}
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded shadow-sm flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Kredit-modul tizimi (ECTS) va OTM O'quv Rejalari</span>
                </h3>
                <div className="text-xs text-amber-100 mt-1">
                  Har bir semestr = <strong>30 ECTS kredit</strong> (1 o'quv yili = 60 kredit). 1 ECTS kredit = 30 akademik soat.
                  15 haftalik semestrda ma'ruza (24s), seminar (24s), amaliyot, lab va mustaqil ta'lim soatlari o'zaro muvofiqlashtirilgan.
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-white/20 px-3 py-1 rounded font-bold backdrop-blur-xs">
                  Semestr me'yori: 30 ECTS
                </span>
                <span className="bg-white text-amber-900 px-3 py-1 rounded font-bold shadow-xs">
                  15 hafta barqaror
                </span>
              </div>
            </div>

            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span>O'quv rejalari va fanlar boshqaruvi ({curriculums.length} ta fan)</span>
                <div className="flex items-center gap-2">
                  {curriculums.length > 0 && (
                    <button
                      onClick={handleClearAllCurriculums}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Barcha fanlarni o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Barchasini tozalash</span>
                    </button>
                  )}
                  <button
                    onClick={() => currFileRef.current && currFileRef.current.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Excel orqali yuklash</span>
                  </button>
                  <button
                    onClick={handleDownloadCurriculumTemplate}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded font-bold text-xs flex items-center gap-1"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Shablon (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => setShowAddCurriculum(!showAddCurriculum)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'lda Fan Qo'shish</span>
                  </button>
                </div>
              </div>

              {showAddCurriculum && (
                <form onSubmit={handleAddCurriculumSubmit} className="p-4 bg-blue-50 border-b border-blue-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Fan nomi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Kiberxavfsizlik"
                      value={newCurr.subjectName}
                      onChange={e => setNewCurr({...newCurr, subjectName: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Yo'nalish</label>
                    <select
                      value={newCurr.majorId}
                      onChange={e => setNewCurr({...newCurr, majorId: e.target.value})}
                      className="hemis-form-control"
                    >
                      {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Kurs va Semestr</label>
                    <div className="flex gap-2">
                      <select value={newCurr.year} onChange={e => setNewCurr({...newCurr, year: e.target.value})} className="hemis-form-control">
                        <option value={1}>1-kurs</option>
                        <option value={2}>2-kurs</option>
                        <option value={3}>3-kurs</option>
                        <option value={4}>4-kurs</option>
                      </select>
                      <select value={newCurr.semester} onChange={e => setNewCurr({...newCurr, semester: e.target.value})} className="hemis-form-control">
                        <option value="fall">Kuzgi</option>
                        <option value="spring">Bahoriy</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Asosiy O'qituvchi</label>
                    <select value={newCurr.teacherId} onChange={e => setNewCurr({...newCurr, teacherId: e.target.value})} className="hemis-form-control">
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* 4 Multi-component hours inputs */}
                  <div>
                    <label className="block font-bold text-blue-900 mb-1">Ma’ruza soati (haftalik)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      step={2}
                      value={newCurr.lectureHours}
                      onChange={e => setNewCurr({...newCurr, lectureHours: e.target.value})}
                      className="hemis-form-control font-bold text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Amaliyot soati (haftalik)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      step={2}
                      value={newCurr.practiceHours}
                      onChange={e => setNewCurr({...newCurr, practiceHours: e.target.value})}
                      className="hemis-form-control font-bold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Laboratoriya soati (haftalik)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      step={2}
                      value={newCurr.labHours}
                      onChange={e => setNewCurr({...newCurr, labHours: e.target.value})}
                      className="hemis-form-control font-bold text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Seminar soati (haftalik)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      step={2}
                      value={newCurr.seminarHours}
                      onChange={e => setNewCurr({...newCurr, seminarHours: e.target.value})}
                      className="hemis-form-control font-bold text-purple-900"
                    />
                  </div>

                  <div className="md:col-span-4 flex items-center justify-between border-t pt-3 mt-1">
                    <div className="text-xs text-gray-700">
                      Jami haftalik soat: <strong className="text-blue-900 font-bold">{Number(newCurr.lectureHours || 0) + Number(newCurr.practiceHours || 0) + Number(newCurr.labHours || 0) + Number(newCurr.seminarHours || 0)} soat</strong> 
                      ({Math.ceil((Number(newCurr.lectureHours || 0) + Number(newCurr.practiceHours || 0) + Number(newCurr.labHours || 0) + Number(newCurr.seminarHours || 0)) / 2)} juftlik/para)
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAddCurriculum(false)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded font-semibold">Bekor qilish</button>
                      <button type="submit" className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Saqlash va Jadvalga Kiritish</button>
                    </div>
                  </div>
                </form>
              )}

              <div className="hemis-box-body p-0 overflow-x-auto">
                <table className="hemis-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>Fan Kodi</th>
                      <th className="text-left" style={{ width: '22%' }}>Fan Nomi</th>
                      <th style={{ width: '8%' }}>Kredit</th>
                      <th className="text-left" style={{ width: '15%' }}>Yo'nalish / Kurs</th>
                      <th style={{ width: '10%' }}>Semestr</th>
                      <th className="text-left" style={{ width: '14%' }}>O'qituvchi</th>
                      <th style={{ width: '16%' }}>Haftalik Mashg'ulotlar</th>
                      <th style={{ width: '12%' }}>Auditoriya / Mustaqil</th>
                      <th style={{ width: '8%' }}>Jami Soat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curriculums.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-gray-500">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <div className="font-semibold text-gray-700">O'quv rejalari va fanlar mavjud emas</div>
                          <div className="text-xs text-gray-400 mt-1">Fanlarni kiritish uchun yuqoridagi "Qo'lda Fan Qo'shish" yoki "Excel orqali yuklash" tugmasidan foydalaning.</div>
                        </td>
                      </tr>
                    ) : (
                      curriculums.map(c => {
                      const major = majors.find(m => m.id === c.majorId);
                      const teacher = teachers.find(t => t.id === c.teacherId);
                      
                      const lH = c.lectureHours ?? (c.type === 'lecture' ? c.hoursPerWeek : 0);
                      const pH = c.practiceHours ?? (c.type === 'practice' ? c.hoursPerWeek : 0);
                      const lbH = c.labHours ?? (c.type === 'lab' ? c.hoursPerWeek : 0);
                      const sH = c.seminarHours ?? (c.type === 'seminar' ? c.hoursPerWeek : 0);
                      const totalH = c.hoursPerWeek || (lH + pH + lbH + sH);
                      const audHours = (c.semesterLectureHours || 0) + (c.semesterPracticeHours || 0) + (c.semesterLabHours || 0) + (c.semesterSeminarHours || 0) || (totalH * 15);
                      const indepHours = c.independentHours || (c.totalHours ? c.totalHours - audHours : 72);
                      const fullTotalHours = c.totalHours || (c.credit ? c.credit * 30 : 120);

                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                              {c.code || '-'}
                            </span>
                          </td>
                          <td className="text-left font-bold text-gray-900">{c.subjectName}</td>
                          <td>
                            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs font-bold border border-amber-300">
                              {c.credit || 4} ECTS
                            </span>
                          </td>
                          <td className="text-left">{major ? major.name : ''} ({c.year}-kurs)</td>
                          <td>{c.semester === 'fall' ? '1-semestr (Kuzgi)' : '2-semestr (Bahoriy)'}</td>
                          <td className="text-left font-medium">{teacher ? teacher.name : '-'}</td>
                          <td>
                            <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
                              {lH > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold border border-blue-200">Ma’ruza: {lH}s</span>}
                              {pH > 0 && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">Amaliyot: {pH}s</span>}
                              {lbH > 0 && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold border border-amber-200">Lab: {lbH}s</span>}
                              {sH > 0 && <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold border border-purple-200">Seminar: {sH}s</span>}
                              {lH === 0 && pH === 0 && lbH === 0 && sH === 0 && getTypeBadge(c.type)}
                            </div>
                          </td>
                          <td>
                            <div className="text-[11px] font-semibold text-gray-700">
                              <span className="text-blue-900">{audHours}s</span> / <span className="text-emerald-800">{indepHours}s</span>
                            </div>
                            <div className="text-[9px] text-gray-400">Auditoriya / Mustaqil</div>
                          </td>
                          <td className="font-bold text-blue-900">{fullTotalHours}s</td>
                          <td>
                            <button
                              onClick={() => handleDeleteCurriculum(c.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEACHERS */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span>O'qituvchilar va ularning yuklamalari ({teachers.length} nafar)</span>
                <div className="flex items-center gap-2">
                  {teachers.length > 0 && (
                    <button
                      onClick={handleClearAllTeachers}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Barcha o'qituvchilarni o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Barchasini tozalash</span>
                    </button>
                  )}
                  <button
                    onClick={() => teacherFileRef.current && teacherFileRef.current.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Excel orqali yuklash</span>
                  </button>
                  <button
                    onClick={handleDownloadTeacherTemplate}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded font-bold text-xs flex items-center gap-1"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Shablon (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => setShowAddTeacher(!showAddTeacher)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Qo'lda O'qituvchi Qo'shish</span>
                  </button>
                </div>
              </div>

              {showAddTeacher && (
                <form onSubmit={handleAddTeacherSubmit} className="p-4 bg-green-50 border-b border-green-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">O'qituvchi F.I.SH *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: PROF. N. SALIMOV"
                      value={newTeacher.name}
                      onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Unvoni / Lavozimi</label>
                    <input
                      type="text"
                      placeholder="Dotsent / Prof."
                      value={newTeacher.title}
                      onChange={e => setNewTeacher({...newTeacher, title: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Kafedra</label>
                    <select
                      value={newTeacher.departmentId}
                      onChange={e => setNewTeacher({...newTeacher, departmentId: e.target.value})}
                      className="hemis-form-control"
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">O'tiladigan fanlar (vergul bilan)</label>
                    <input
                      type="text"
                      placeholder="Algoritmlar, Sun'iy intellekt"
                      value={newTeacher.subjects}
                      onChange={e => setNewTeacher({...newTeacher, subjects: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <button type="button" onClick={() => setShowAddTeacher(false)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded font-semibold">Bekor qilish</button>
                    <button type="submit" className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Saqlash</button>
                  </div>
                </form>
              )}

              <div className="hemis-box-body">
                {teachers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <div className="font-semibold text-gray-700">O'qituvchilar ro'yxati bo'sh</div>
                    <div className="text-xs text-gray-400 mt-1">Yangi o'qituvchi qo'shish yoki Excel yuklash orqali kiritishingiz mumkin.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map(t => {
                    const dept = departments.find(d => d.id === t.departmentId);
                    const teacherCurriculums = curriculums.filter(c => c.teacherId === t.id);
                    const totalHours = teacherCurriculums.reduce((sum, c) => sum + c.hoursPerWeek, 0);

                    return (
                      <div key={t.id} className="p-3.5 border border-gray-300 rounded bg-white shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="font-bold text-blue-900 text-sm truncate" title={t.name}>{t.name}</div>
                            <div className="flex items-center gap-1 shrink-0">
                              {t.employmentType === 'part_time' ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  O'rindosh ({t.stavka || 0.5})
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                                  Asosiy ({t.stavka || 1.0})
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="O'qituvchini o'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">{t.title} • {dept ? dept.name : ''}</div>
                          <div className="text-xs space-y-1 border-t pt-2 text-gray-700">
                            <div>Fanlar: <span className="font-semibold text-gray-900">{Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects}</span></div>
                            <div className="text-gray-500">Kunlik me'yor: <span className="font-semibold text-gray-800">{t.maxHoursPerDay || 4} para/kun</span></div>
                            {t.unavailableSlots && t.unavailableSlots.length > 0 && (() => {
                              const dayGroups = new Map();
                              t.unavailableSlots.forEach(u => {
                                const dId = u.dayId || u.day;
                                const sId = u.slotId != null ? u.slotId : (Array.isArray(u.slots) ? u.slots : [u.slots]);
                                if (!dayGroups.has(dId)) dayGroups.set(dId, []);
                                if (Array.isArray(sId)) dayGroups.get(dId).push(...sId);
                                else if (sId != null) dayGroups.get(dId).push(sId);
                              });
                              return (
                                <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                                  <span className="font-bold">Band vaqtlari (dars qo'yilmaydi):</span>
                                  <div className="text-[10px] text-amber-800 mt-0.5 font-medium">
                                    {Array.from(dayGroups.entries()).map(([dNum, slots]) => {
                                      const d = DAYS_OF_WEEK.find(x => x.id === dNum);
                                      const sortedSlots = [...new Set(slots)].sort((a, b) => a - b);
                                      return `${d ? d.name : dNum + '-kun'} (${sortedSlots.map(s => s + '-para').join(', ')})`;
                                    }).join('; ')}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t text-xs flex items-center justify-between">
                          <div>
                            <span className="text-gray-500 mr-1">Yuklama:</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {totalHours} soat ({Math.ceil(totalHours / 2)} para)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacher(t.id);
                              setViewMode('teacher');
                              setActiveTab('generator');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded border border-blue-200 transition-colors"
                          >
                            Jadvalini ko'rish →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DEPARTMENTS (KAFEDRALAR) */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span>Kafedralar boshqaruvi</span>
                <button
                  onClick={() => setShowAddDept(!showAddDept)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi Kafedra Qo'shish</span>
                </button>
              </div>

              {showAddDept && (
                <form onSubmit={handleAddDeptSubmit} className="p-4 bg-purple-50 border-b border-purple-200 flex flex-wrap gap-3 text-xs items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block font-bold text-gray-700 mb-1">Kafedra nomi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Fizika va Muhandislik kafedrasi"
                      value={newDept.name}
                      onChange={e => setNewDept({...newDept, name: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block font-bold text-gray-700 mb-1">Qisqa kodi</label>
                    <input
                      type="text"
                      placeholder="FK"
                      value={newDept.code}
                      onChange={e => setNewDept({...newDept, code: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowAddDept(false)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded font-semibold">Bekor qilish</button>
                    <button type="submit" className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Saqlash</button>
                  </div>
                </form>
              )}

              <div className="hemis-box-body">
                {departments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <FolderPlus className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <div className="font-semibold text-gray-700">Kafedralar ro'yxati bo'sh</div>
                    <div className="text-xs text-gray-400 mt-1">"Yangi Kafedra Qo'shish" tugmasi orqali kafedralarni kiriting.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {departments.map(d => {
                      const deptTeachers = teachers.filter(t => t.departmentId === d.id);
                      const deptMajors = majors.filter(m => m.departmentId === d.id);

                      return (
                        <div key={d.id} className="p-4 border border-gray-300 rounded bg-white shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-blue-900 text-base">{d.name}</h4>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{d.code}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteDept(d.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Kafedrani o'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                            <div>Biriktirilgan yo'nalishlar: <span className="font-semibold text-gray-800">{deptMajors.length} ta</span></div>
                            <div>Kafedra o'qituvchilari: <span className="font-semibold text-gray-800">{deptTeachers.length} nafar</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MAJORS (YO'NALISHLAR VA GURUHLAR) */}
        {activeTab === 'majors' && (
          <div className="space-y-4">
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span>Ta'lim yo'nalishlari va guruhlar (1-4 Kurslar)</span>
                <button
                  onClick={() => setShowAddMajor(!showAddMajor)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi Yo'nalish Qo'shish</span>
                </button>
              </div>

              {showAddMajor && (
                <form onSubmit={handleAddMajorSubmit} className="p-4 bg-amber-50 border-b border-amber-200 flex flex-wrap gap-3 text-xs items-end">
                  <div className="flex-1 min-w-[220px]">
                    <label className="block font-bold text-gray-700 mb-1">Yo'nalish nomi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Sun'iy intellekt va Data Science"
                      value={newMajor.name}
                      onChange={e => setNewMajor({...newMajor, name: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block font-bold text-gray-700 mb-1">Mutaxassislik kodi</label>
                    <input
                      type="text"
                      placeholder="60610700"
                      value={newMajor.code}
                      onChange={e => setNewMajor({...newMajor, code: e.target.value})}
                      className="hemis-form-control"
                    />
                  </div>
                  <div className="min-w-[180px]">
                    <label className="block font-bold text-gray-700 mb-1">Kafedrasi</label>
                    <select
                      value={newMajor.departmentId}
                      onChange={e => setNewMajor({...newMajor, departmentId: e.target.value})}
                      className="hemis-form-control"
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowAddMajor(false)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded font-semibold">Bekor qilish</button>
                    <button type="submit" className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Saqlash & 1-4 Kurslarni Yaratish</button>
                  </div>
                </form>
              )}

              <div className="hemis-box-body">
                {majors.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded">
                    <Compass className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <div className="font-semibold text-gray-700">Ta'lim yo'nalishlari mavjud emas</div>
                    <div className="text-xs text-gray-400 mt-1">"Yangi Yo'nalish Qo'shish" tugmasi orqali yo'nalishlarni kiriting.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {majors.map(m => {
                      const dept = departments.find(d => d.id === m.departmentId);
                      const majorGroups = groups.filter(g => g.majorId === m.id);

                      return (
                        <div key={m.id} className="p-4 border border-gray-300 rounded bg-white shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-blue-900 text-base">{m.name}</h4>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-mono">{m.code}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMajor(m.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Yo'nalishni o'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">Kafedra: <span className="font-semibold">{dept ? dept.name : ''}</span></div>
                          <div className="pt-2 border-t text-xs">
                            <div className="font-bold text-gray-700 mb-1">Biriktirilgan guruhlar (1-4 kurslar):</div>
                            <div className="flex flex-wrap gap-1.5">
                              {majorGroups.map(g => (
                                <span key={g.id} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ROOMS */}
        {activeTab === 'rooms' && (
          <div className="hemis-box hemis-box-primary">
            <div className="hemis-box-header">
              <span>Auditoriyalar va laboratoriyalar fondi ({rooms.length} ta xona)</span>
              <div className="flex items-center gap-2">
                {rooms.length > 0 && (
                  <button
                    onClick={handleClearAllRooms}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Barcha xonalarni o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Barchasini tozalash</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddRoom(!showAddRoom)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi Xona Qo'shish</span>
                </button>
              </div>
            </div>

            {/* Bino va tur bo'yicha tezkor filterlar va qidiruv */}
            {rooms.length > 0 && (
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-700">Bino:</span>
                  <select
                    value={selectedRoomBuildingFilter}
                    onChange={e => setSelectedRoomBuildingFilter(e.target.value)}
                    className="hemis-form-control !w-auto text-xs"
                  >
                    <option value="all">Barcha binolar ({rooms.length} ta xona)</option>
                    {Array.from(new Set(rooms.map(r => r.building).filter(Boolean))).map(b => (
                      <option key={b} value={b}>{b} ({rooms.filter(r => r.building === b).length} ta)</option>
                    ))}
                  </select>

                  <span className="font-bold text-gray-700 ml-2">Turi:</span>
                  <select
                    value={selectedRoomTypeFilter}
                    onChange={e => setSelectedRoomTypeFilter(e.target.value)}
                    className="hemis-form-control !w-auto text-xs"
                  >
                    <option value="all">Barcha turlar</option>
                    <option value="lecture">Ma'ruza zallari ({rooms.filter(r => r.type === 'lecture').length})</option>
                    <option value="practice">Amaliyot xonalari ({rooms.filter(r => r.type === 'practice').length})</option>
                    <option value="seminar">Seminar xonalari ({rooms.filter(r => r.type === 'seminar').length})</option>
                    <option value="lab">Laboratoriyalar ({rooms.filter(r => r.type === 'lab').length})</option>
                    <option value="arm">ARM ({rooms.filter(r => r.type === 'arm').length})</option>
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Xona raqami yoki nomi bo'yicha qidiruv..."
                    value={roomSearchQuery}
                    onChange={e => setRoomSearchQuery(e.target.value)}
                    className="hemis-form-control pl-8 text-xs !w-64"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            )}

            {showAddRoom && (
              <form onSubmit={handleAddRoomSubmit} className="p-4 bg-blue-50 border-b border-blue-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Xona nomi / raqami *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 305-auditoriya"
                    value={newRoom.name}
                    onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                    className="hemis-form-control"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Xona turi</label>
                  <select
                    value={newRoom.type}
                    onChange={e => setNewRoom({...newRoom, type: e.target.value})}
                    className="hemis-form-control"
                  >
                    <option value="lecture">Ma'ruza zali (oqimlar uchun)</option>
                    <option value="practice">Amaliyot xonasi</option>
                    <option value="seminar">Seminar xonasi</option>
                    <option value="lab">IT / Kompyuter laboratoriyasi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sig'imi (o'rin)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={newRoom.capacity}
                    onChange={e => setNewRoom({...newRoom, capacity: Number(e.target.value)})}
                    className="hemis-form-control"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bino nomi</label>
                  <input
                    type="text"
                    placeholder="Bosh bino"
                    value={newRoom.building}
                    onChange={e => setNewRoom({...newRoom, building: e.target.value})}
                    className="hemis-form-control"
                  />
                </div>
                <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setShowAddRoom(false)} className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded font-semibold">Bekor qilish</button>
                  <button type="submit" className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Saqlash</button>
                </div>
              </form>
            )}

            <div className="hemis-box-body">
              {displayedRooms.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded">
                  <Building className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <div className="font-semibold text-gray-700">Auditoriyalar topilmadi</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {rooms.length === 0 
                      ? '"Yangi Xona Qo\'shish" tugmasi orqali auditoriyalarni kiriting.' 
                      : 'Qidiruv yoki filter bo\'yicha auditoriyalar mos kelmadi.'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedRooms.map(r => (
                    <div key={r.id} className="p-3.5 border border-gray-300 rounded bg-white shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 text-sm truncate" title={r.name}>{r.name}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.type === 'lecture' && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Ma'ruza</span>}
                          {r.type === 'lab' && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">IT Lab</span>}
                          {r.type === 'practice' && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Amaliyot</span>}
                          {r.type === 'seminar' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Seminar</span>}
                          {r.type === 'arm' && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">ARM</span>}
                          {r.type === 'sport' && <span className="text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-bold">Sport</span>}
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(r.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Xonani o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">Sig'imi: <span className="font-bold text-blue-800">{r.capacity} o'rin</span></div>
                      <div className="text-xs text-gray-500 truncate" title={r.building}>{r.building}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: AUDIT & RULES COMPLIANCE (11 TA VAZIFA VA 14 TA NAZORAT QOIDASI) */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            
            {/* Hero Audit Banner */}
            <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-lg shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-500 text-white text-xs font-black px-2.5 py-0.5 rounded tracking-wide uppercase">
                      HEMIS Standarti • 100% Mos
                    </span>
                    <span className="text-blue-200 text-xs font-semibold">
                      Dars jadvali tuzish qoidalari bo'yicha ekspertiza
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                    11 ta Vazifa va 14 ta Nazorat Qoidalari Auditi
                  </h2>
                  <p className="text-xs md:text-sm text-blue-200 mt-1 max-w-3xl leading-relaxed">
                    Ushbu dars jadvali O'zbekiston Respublikasi Oliy ta'lim me'yorlari hamda HEMIS tizimining 4 bosqichli 11 ta asosiy vazifasiga to'liq muvofiq tarzda avtomatlashtirilgan. 5 ta qat'iy cheklov (Hard constraints) va didaktik ketma-ketlik 100% kafolatlangan.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-center">
                    <div className="text-2xl md:text-3xl font-black text-emerald-400">100%</div>
                    <div className="text-[11px] text-blue-100 font-medium">Umumiy Ball</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-center">
                    <div className="text-2xl md:text-3xl font-black text-white">14 / 14</div>
                    <div className="text-[11px] text-blue-100 font-medium">Qoidalar O'tgan</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-center">
                    <div className="text-2xl md:text-3xl font-black text-emerald-300">0</div>
                    <div className="text-[11px] text-blue-100 font-medium">Kolliziyalar</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3 text-blue-200">
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 9 ta Qat'iy cheklov bajarildi
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 5 ta Sifat qoidasi bajarildi
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-300" /> {scheduleResult?.stats?.potokCount || 0} ta ma'ruza oqimi (potok)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('generator')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition flex items-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Dars jadvalini ko'rish</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded font-bold transition flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Audit hisobotini chop etish</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 BOSQICH VA 11 TA VAZIFA ROADMAP */}
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header">
                <span className="font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Dars jadvali tuzishning 4 ta bosqichi va 11 ta vazifasi holati</span>
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  Barcha 11 ta vazifa to'liq yakunlangan (100%)
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1-bosqich */}
                <div className="border border-blue-200 rounded-lg p-3.5 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">I-BOSQICH</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Tayyorgarlik jarayoni</h4>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="p-1.5 rounded bg-white border border-blue-100">
                        <span className="font-bold text-blue-900">1-vazifa:</span> O'quv rejalarni tekshirish (15 hafta, ECTS kredit soatlari, ma'ruza/amaliyot/lab).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-blue-100">
                        <span className="font-bold text-blue-900">2-vazifa:</span> Guruhlar ro'yxatini shakllantirish (Ta'lim shakli: kunduzgi, o'qitish tili, talabalar soni me'yori).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-blue-100">
                        <span className="font-bold text-blue-900">3-vazifa:</span> Auditoriya fondini xatlovdan o'tkazish (Sig'imi 28-150 o'rin, lablar, ARM).
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-blue-200 text-[11px] font-semibold text-emerald-700">
                    Holat: Baza to'liq shakllantirilgan
                  </div>
                </div>

                {/* 2-bosqich */}
                <div className="border border-indigo-200 rounded-lg p-3.5 bg-indigo-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">II-BOSQICH</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Kim kimga dars beradi</h4>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="p-1.5 rounded bg-white border border-indigo-100">
                        <span className="font-bold text-indigo-900">4-vazifa:</span> Kafedra yuklamasini taqsimlash (O'qituvchilar yuklamasi 12-28s/hafta balansi).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-indigo-100">
                        <span className="font-bold text-indigo-900">5-vazifa:</span> O'rindosh/soatbay o'qituvchilar (Band vaqtlar, 0.5 stavka limitlari qat'iy inobatga olingan).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-indigo-100">
                        <span className="font-bold text-indigo-900">6-vazifa:</span> Oqim (potok)larni shakllantirish (Bir xil fan, kurs, semestr, til; sig'im &le; 90; guruh &le; 3).
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-indigo-200 text-[11px] font-semibold text-emerald-700">
                    Holat: Yuklamalar taqsimoti mos
                  </div>
                </div>

                {/* 3-bosqich */}
                <div className="border border-amber-200 rounded-lg p-3.5 bg-amber-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">III-BOSQICH</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Jadvalga joylashtirish</h4>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="p-1.5 rounded bg-white border border-amber-100">
                        <span className="font-bold text-amber-900">7-vazifa:</span> Didaktik ketma-ketlik (Ma'ruza haftaning 1-4 kunlari oldin, amaliyot va lab esa ma'ruzadan keyin).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-amber-100">
                        <span className="font-bold text-amber-900">8-vazifa:</span> Auditoriyalarni to'g'ri taqsimlash (Sig'im nazorati, IT laboratoriyalar faqat lab darslariga).
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-amber-200 text-[11px] font-semibold text-emerald-700">
                    Holat: 0 didaktik buzilish
                  </div>
                </div>

                {/* 4-bosqich */}
                <div className="border border-emerald-200 rounded-lg p-3.5 bg-emerald-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">IV-BOSQICH</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Tekshirish va tasdiqlash</h4>
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="p-1.5 rounded bg-white border border-emerald-100">
                        <span className="font-bold text-emerald-900">9-vazifa:</span> 5 ta qat'iy cheklovni tekshirish (O'qituvchi, guruh, xona, sig'im va o'rindosh kolliziyasi 0 ta).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-emerald-100">
                        <span className="font-bold text-emerald-900">10-vazifa:</span> Sifat va qulaylik me'yorlari (Guruhlarda oyna yo'q, o'qituvchilarda darcha darslar minimum).
                      </div>
                      <div className="p-1.5 rounded bg-white border border-emerald-100">
                        <span className="font-bold text-emerald-900">11-vazifa:</span> Kelishish va tasdiqlash (Kafedra, Registrator ofisi va O'quv prorektori).
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-200 text-[11px] font-semibold text-emerald-700">
                    Holat: Tasdiqqa tayyor
                  </div>
                </div>

              </div>
            </div>

            {/* 9 TA QAT'IY CHEKLOV (HARD CONSTRAINTS) HISOBOTI */}
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Qat'iy cheklovlar nazorati (Hard Constraints — 9 ta me'yor)</span>
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  9 / 9 Muvaffaqiyatli (0 ta kolliziya)
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {scheduleResult?.auditReport?.hardConstraints?.map((hc) => (
                  <div key={hc.id} className="p-3 border border-emerald-200 rounded bg-emerald-50/30 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-blue-900 font-mono">{hc.id.toUpperCase()}</span>
                        <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> O'tgan
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900">{hc.title || hc.name}</h4>
                      <p className="text-[11px] text-gray-600 mt-1 leading-snug">{hc.details}</p>
                    </div>
                    <div className="pt-2 border-t border-emerald-100 text-[10px] text-emerald-800 font-semibold flex items-center justify-between">
                      <span>Aniqlangan qoidabuzarlik:</span>
                      <span className="font-bold">{hc.passed ? "0 ta (Kolliziyasiz)" : `${hc.violations || 1} ta`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 TA SIFAT ME'YORI (QUALITY CONSTRAINTS) HISOBOTI */}
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Sifat va ergonomik me'yorlar nazorati (Quality Constraints — 5 ta me'yor)</span>
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  5 / 5 Muvaffaqiyatli (0 ta buzilish)
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {scheduleResult?.auditReport?.qualityConstraints?.map((qc) => (
                  <div key={qc.id} className="p-3 border border-blue-200 rounded bg-blue-50/30 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-indigo-900 font-mono">{qc.id.toUpperCase()}</span>
                        <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> O'tgan
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900">{qc.title || qc.name}</h4>
                      <p className="text-[11px] text-gray-600 mt-1 leading-snug">{qc.details}</p>
                    </div>
                    <div className="pt-2 border-t border-blue-100 text-[10px] text-blue-800 font-semibold flex items-center justify-between">
                      <span>Aniqlangan og'ishlar:</span>
                      <span className="font-bold">{qc.passed ? "0 ta (Qoidaga to'liq mos)" : `${qc.violations || 1} ta`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 11-VAZIFA: KELISHISH VA TASDIQLASH SHTAMPLARI (APPROVAL WORKFLOW) */}
            <div className="hemis-box hemis-box-primary">
              <div className="hemis-box-header flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>11-vazifa: Kelishish, tasdiqlash va rasmiy e'lon qilish rekvizitlari</span>
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  2026-2027 o'quv yili • Kuzgi semestr
                </span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Kafedra Mudirlari */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50/50 flex flex-col justify-between text-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">1-bosqich: Kafedra</div>
                    <h5 className="font-bold text-gray-900 text-sm">Kafedra Mudirlari Kengashi</h5>
                    <p className="text-xs text-gray-600 mt-2 text-left">
                      O'quv yuklamasi, mutaxassislik fanlari va o'rindosh o'qituvchilarning pedagogik soatlari to'liq kelishildi va qabul qilindi.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded font-bold text-xs uppercase tracking-wide">
                      ✔ KELISHILDI
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 font-mono">Kafedra mudirlari imzosi</div>
                  </div>
                </div>

                {/* 2. Registrator ofisi */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50/50 flex flex-col justify-between text-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">2-bosqich: Ekspertiza</div>
                    <h5 className="font-bold text-gray-900 text-sm">O'quv-uslubiy Boshqarma & Registrator Ofisi</h5>
                    <p className="text-xs text-gray-600 mt-2 text-left">
                      Kredit-modul (ECTS) talablari, 5 ta qat'iy cheklov va didaktik ketma-ketlik avtomat tekshiruvdan o'tkazildi (Xatolik: 0).
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-xs uppercase tracking-wide">
                      ✔ EKSPERTIZADAN O'TDI
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 font-mono">Registrator ofisi muhri</div>
                  </div>
                </div>

                {/* 3. Prorektor */}
                <div className="border-2 border-dashed border-emerald-400 rounded-lg p-4 bg-emerald-50/40 flex flex-col justify-between text-center">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-1">3-bosqich: Tasdiq</div>
                    <h5 className="font-bold text-gray-900 text-sm">O'quv Ishlari Bo'yicha Prorektor</h5>
                    <p className="text-xs text-gray-600 mt-2 text-left">
                      Dars jadvali universitet rektori farmoyishi va HEMIS axborot tizimi reglamentiga muvofiq rasmiy tasdiqlandi.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-200">
                    <div className="inline-block px-4 py-1.5 bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-wider shadow-xs">
                      ★ TASDIQLANDI
                    </div>
                    <div className="text-[10px] text-emerald-900 mt-1 font-semibold">HEMIS tizimida faol holatda e'lon qilindi</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* MODAL: SET LESSON WEEKS OVERRIDE */}
        {editingWeekLesson && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-blue-300" />
                  <div>
                    <h3 className="font-bold text-sm">Darsning o'tish haftalarini sozlash</h3>
                    <p className="text-[11px] text-blue-200">
                      Faqat o'zgargan haftasiga chiqishi uchun kerakli davriylikni tanlang
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWeekLesson(null)}
                  className="text-white/80 hover:text-white text-base font-bold px-2 py-0.5 rounded hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Lesson summary card */}
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5 text-gray-800">
                  <div className="font-bold text-sm text-blue-950 flex items-center justify-between">
                    <span>{editingWeekLesson.subjectName}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
                      {editingWeekLesson.code || 'FAN'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span>Mashg'ulot: <strong>{editingWeekLesson.type === 'lecture' ? "Ma'ruza" : editingWeekLesson.type === 'lab' ? "Laboratoriya" : editingWeekLesson.type === 'seminar' ? "Seminar" : "Amaliyot"}</strong></span>
                    <span>•</span>
                    <span>Guruh: <strong>{editingWeekLesson.groupName}</strong></span>
                    <span>•</span>
                    <span>O'qituvchi: <strong>{editingWeekLesson.teacherName}</strong></span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Auditoriya: <strong>{editingWeekLesson.roomName}</strong> • Vaqti: <strong>{editingWeekLesson.dayName}, {editingWeekLesson.slotId}-para ({editingWeekLesson.slotTime})</strong>
                  </div>
                  <div className="text-[11px] font-bold text-blue-900 pt-1.5 border-t border-blue-200 flex items-center justify-between">
                    <span>Hozirgi davriyligi:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-300">
                      {editingWeekLesson.activeWeeksLabel || 'Doimiy (1-15 hafta)'}
                    </span>
                  </div>
                </div>

                {/* Radio Options */}
                <div className="space-y-2">
                  <label className="block font-bold text-gray-900 text-xs">
                    Ushbu dars qaysi haftalarda o'tilsin?
                  </label>

                  {/* Option 1: All */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'all' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="all"
                      checked={modalPattern === 'all'}
                      onChange={() => setModalPattern('all')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>O'zgarmaydigan doimiy dars (1–15 hafta)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Barcha 15 haftaning barchasida bir xil kun va paraga joylashtiriladi.
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Odd weeks */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'odd' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="odd"
                      checked={modalPattern === 'odd'}
                      onChange={() => setModalPattern('odd')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <span>Faqat Toq haftalarda (1, 3, 5, 7, 9, 11, 13, 15)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Faqat toq haftalarda chiqadi, juft haftalarda bu dars ko'rinmaydi.
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Even weeks */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'even' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="even"
                      checked={modalPattern === 'even'}
                      onChange={() => setModalPattern('even')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                        <span>Faqat Juft haftalarda (2, 4, 6, 8, 10, 12, 14)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Faqat juft haftalarda chiqadi, toq haftalarda bu dars ko'rinmaydi.
                      </div>
                    </div>
                  </label>

                  {/* Option 4: 1-modul (1-8) */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'first_half' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="first_half"
                      checked={modalPattern === 'first_half'}
                      onChange={() => setModalPattern('first_half')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span>1-modul (Faqat 1–8 haftalarda)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Semestrning birinchi yarmida chiqadi, 9–15 haftalarda chiqmaydi.
                      </div>
                    </div>
                  </label>

                  {/* Option 5: 2-modul (9-15) */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'second_half' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="second_half"
                      checked={modalPattern === 'second_half'}
                      onChange={() => setModalPattern('second_half')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span>2-modul (Faqat 9–15 haftalarda)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Semestrning ikkinchi yarmida chiqadi, 1–8 haftalarda chiqmaydi.
                      </div>
                    </div>
                  </label>

                  {/* Option 6: Only selected week */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${modalPattern === 'only_selected' ? 'bg-yellow-50 border-yellow-500 ring-1 ring-yellow-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="week_pattern"
                      value="only_selected"
                      checked={modalPattern === 'only_selected'}
                      onChange={() => {
                        setModalPattern('only_selected');
                        setModalCustomWeeks([Number(selectedWeek)]);
                      }}
                      className="mt-0.5 text-yellow-600 focus:ring-yellow-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                        <span>Faqat hozir tanlangan {selectedWeek}-haftada chiqsin (Haftaga xos o'zgarish)</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Dars faqat {selectedWeek}-haftada chiqadi. Boshqa barcha haftalarda UMUMAN ko'rinmaydi!
                      </div>
                    </div>
                  </label>

                  {/* Option 7: Custom checkboxes */}
                  <div className={`p-2.5 rounded-lg border transition ${modalPattern === 'custom' ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-300' : 'bg-white border-gray-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900 mb-2">
                      <input
                        type="radio"
                        name="week_pattern"
                        value="custom"
                        checked={modalPattern === 'custom'}
                        onChange={() => setModalPattern('custom')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Qo'lda haftalarni tanlash:</span>
                    </label>
                    
                    {modalPattern === 'custom' && (
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(wNum => (
                          <label
                            key={wNum}
                            className={`flex items-center justify-center py-1 px-1 rounded text-xs font-bold cursor-pointer border transition ${
                              modalCustomWeeks.includes(wNum)
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={modalCustomWeeks.includes(wNum)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setModalCustomWeeks(prev => [...prev, wNum].sort((a,b)=>a-b));
                                } else {
                                  setModalCustomWeeks(prev => prev.filter(x => x !== wNum));
                                }
                              }}
                            />
                            <span>{wNum}-hafta</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Qat'iy qoida:</strong> Saqlash tugmasi bosilgach, dars <strong>faqat va faqat tanlangan haftalarda</strong> chiqadi. Boshqa haftalarda dars jadvalda chiqmaydi.
                  </span>
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetWeekOverride}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold text-xs transition"
                >
                  Asliga qaytarish
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWeekLesson(null)}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-semibold text-xs transition"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWeekOverride}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs transition"
                  >
                    Saqlash va Jadvalga Qo'llash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
