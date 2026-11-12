/**
 * نظام إدارة النتائج - Results Management System
 * المشروع النهائي: Vanilla JavaScript
 * (Classes + Encapsulation + DOM + try/catch + filter / map / reduce)
 */

"use strict";

/* ==========================================================================
   الثوابت (مكان واحد لتغيير القواعد)
   ========================================================================== */
const MIN_SCORE = 0;          // أقل قيمة مسموحة للدرجة ولنسبة الحضور
const MAX_SCORE = 100;        // أعلى قيمة مسموحة
const GRACE_RANGE_MIN = 40;   // بداية نطاق لجنة الرأفة (شامل)
const GRACE_RANGE_MAX = 49;   // نهاية نطاق لجنة الرأفة (شامل)
const GRACE_MARKS = 5;        // درجات الرأفة التي تُضاف إلى المتوسط

/* ==========================================================================
   دوال مساعدة للتحقق (تستخدمها دوال set داخل الكلاس)
   ========================================================================== */

/** تحويل أي قيمة إلى نص بعد حذف المسافات من أطرافه (null / undefined تصبح نصًا فارغًا). */
function toTrimmedText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

/**
 * التحقق من درجة أو نسبة حضور وتحويلها إلى رقم.
 * نتحقق من الفراغ أولًا، لأن Number("") تساوي 0 وكانت ستمر كأنها درجة صحيحة.
 */
function parseScore(value, fieldName) {
  const text = toTrimmedText(value);

  // 1) الحقل فارغ (أو يحتوي قيمة غير صالحة يعيدها حقل الأرقام فارغة)
  if (text === "") {
    throw new Error(`يرجى إدخال ${fieldName}؛ الحقل فارغ أو قيمته غير صالحة.`);
  }

  // 2) يجب أن تكون عددًا صحيحًا (بدون كسور أو حروف أو رموز)
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`${fieldName} يجب أن تكون عددًا صحيحًا.`);
  }

  // 3) يجب أن تكون ضمن النطاق من 0 إلى 100
  const number = Number(text);
  if (number < MIN_SCORE || number > MAX_SCORE) {
    throw new Error(`${fieldName} يجب أن تكون بين ${MIN_SCORE} و ${MAX_SCORE}.`);
  }

  return number;
}

/* ==========================================================================
   1. كلاس Student (التغليف: حقول خاصة # + دوال get / set)
   ========================================================================== */
class Student {
  // الحقول الخاصة: لا يمكن الوصول إليها من خارج الكلاس مباشرة
  #name;
  #grade1;
  #grade2;
  #grade3;
  #attendance;

  /**
   * القيم تمر عبر دوال set، فإذا كانت أي قيمة خاطئة يُرمى خطأ
   * ولا يتم إنشاء الكائن أصلًا.
   */
  constructor(name, grade1, grade2, grade3, attendance) {
    this.name = name;
    this.grade1 = grade1;
    this.grade2 = grade2;
    this.grade3 = grade3;
    this.attendance = attendance;
  }

  /* ---------- الاسم ---------- */
  get name() {
    return this.#name;
  }
  set name(value) {
    const text = toTrimmedText(value);
    if (text === "") {
      throw new Error("اسم الطالب فارغ. يرجى إدخال الاسم.");
    }
    this.#name = text;
  }

  /* ---------- درجات المواد الثلاث ---------- */
  get grade1() {
    return this.#grade1;
  }
  set grade1(value) {
    this.#grade1 = parseScore(value, "درجة المادة الأولى");
  }

  get grade2() {
    return this.#grade2;
  }
  set grade2(value) {
    this.#grade2 = parseScore(value, "درجة المادة الثانية");
  }

  get grade3() {
    return this.#grade3;
  }
  set grade3(value) {
    this.#grade3 = parseScore(value, "درجة المادة الثالثة");
  }

  /* ---------- نسبة الحضور ---------- */
  get attendance() {
    return this.#attendance;
  }
  set attendance(value) {
    this.#attendance = parseScore(value, "نسبة الحضور");
  }

  /** الدرجات الثلاث في مصفوفة جديدة (نسخة، فلا يمكن تعديل الأصل من الخارج). */
  get grades() {
    return [this.#grade1, this.#grade2, this.#grade3];
  }

  /**
   * متوسط الدرجات (من التكليف الثاني):
   * reduce لجمع الدرجات، ثم القسمة على عددها، والتقريب إلى خانتين عشريتين.
   */
  calculateAverage() {
    const total = this.grades.reduce((sum, grade) => sum + grade, 0);
    const average = total / this.grades.length;
    return Math.round(average * 100) / 100;
  }
}

/* ==========================================================================
   2. سلة حفظ الطلاب (فارغة في البداية) + الإمساك بعناصر الشاشة
   ========================================================================== */
const studentsList = [];

const nameInput = document.getElementById("student-name");
const grade1Input = document.getElementById("grade1");
const grade2Input = document.getElementById("grade2");
const grade3Input = document.getElementById("grade3");
const attendanceInput = document.getElementById("attendance");

const addStudentBtn = document.getElementById("add-student-btn");
const graceBtn = document.getElementById("grace-btn");

const errorBox = document.getElementById("error-box");
const studentsListBox = document.getElementById("students-list");
const graceReportBox = document.getElementById("grace-report");

/* ==========================================================================
   3. دوال العرض
   ========================================================================== */

/** تحويل النص إلى نص آمن قبل وضعه داخل HTML (حتى لا يُفسَّر اسم مثل <b> ككود). */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** عرض أسماء الطلاب الذين تمت إضافتهم في صندوق القائمة. */
function displayStudents() {
  const items = studentsList
    .map((student) => `<li class="list-group-item">${escapeHtml(student.name)}</li>`)
    .join("");

  studentsListBox.innerHTML = `<ol class="list-group list-group-numbered">${items}</ol>`;
}

/** تفريغ حقول الإدخال بعد نجاح الإضافة. */
function clearInputs() {
  nameInput.value = "";
  grade1Input.value = "";
  grade2Input.value = "";
  grade3Input.value = "";
  attendanceInput.value = "";
}

/* ==========================================================================
   4. زر "إضافة طالب" (try / catch)
   ========================================================================== */
addStudentBtn.onclick = function () {
  errorBox.textContent = ""; // مسح أي رسالة خطأ قديمة

  try {
    // أخذ القيم من حقول الإدخال (كما كتبها المستخدم، والتحقق يتم داخل الكلاس)
    const name = nameInput.value;
    const grade1 = grade1Input.value;
    const grade2 = grade2Input.value;
    const grade3 = grade3Input.value;
    const attendance = attendanceInput.value;

    // إنشاء الكائن: إذا كانت أي قيمة خاطئة يرمي الكلاس خطأ وننتقل إلى catch
    const student = new Student(name, grade1, grade2, grade3, attendance);

    // لا نصل إلى هنا إلا بعد نجاح التحقق وإنشاء الكائن
    studentsList.push(student);
    displayStudents();
    clearInputs();
  } catch (error) {
    // عرض رسالة الخطأ على الشاشة (وليس في الكونسول)
    errorBox.textContent = error.message;
  }
};

/* ==========================================================================
   5. زر "تفعيل لجنة الرأفة" (filter -> map -> reduce)
   ========================================================================== */
graceBtn.onclick = function () {
  errorBox.textContent = "";

  // Filter: الطلاب الذين متوسطهم من 40 إلى 49 (شامل الحدين)
  // لا نستخدم نسبة الحضور هنا إطلاقًا.
  const strugglingStudents = studentsList.filter((student) => {
    const average = student.calculateAverage();
    return average >= GRACE_RANGE_MIN && average <= GRACE_RANGE_MAX;
  });

  // Map: كائنات جديدة تحمل المتوسط بعد إضافة درجات الرأفة،
  // فلا تتغير بيانات الطلاب الأصلية داخل studentsList.
  const gracedStudents = strugglingStudents.map((student) => ({
    name: student.name,
    newAverage: Math.round((student.calculateAverage() + GRACE_MARKS) * 100) / 100,
  }));

  // شرط يمنع القسمة على صفر: لا يوجد طلاب متعثرون
  if (gracedStudents.length === 0) {
    graceReportBox.innerHTML = `<div class="alert alert-secondary mb-0">لا يوجد طلاب متعثرون.</div>`;
    return;
  }

  // Reduce: مجموع المتوسطات الجديدة، ثم القسمة على عدد الطلاب المتعثرين
  const totalNewAverages = gracedStudents.reduce((sum, student) => sum + student.newAverage, 0);
  const generalAverage = totalNewAverages / gracedStudents.length;

  // Template Literals: بناء كود HTML للتقرير النهائي
  const namesItems = gracedStudents
    .map((student) => `<li class="list-group-item">${escapeHtml(student.name)}</li>`)
    .join("");

  graceReportBox.innerHTML = `
    <p class="mb-2">عدد الطلاب المتعثرين: <strong>${gracedStudents.length}</strong></p>
    <p class="mb-1">أسماء الطلاب المتعثرين:</p>
    <ul class="list-group mb-3">${namesItems}</ul>
    <p class="mb-0">المتوسط العام بعد الرأفة: <strong>${generalAverage.toFixed(2)}</strong></p>
  `;
};
