// Export / import des questions du sondage au format Word (.docx).
// Les bibliothèques « docx » et « mammoth » sont chargées à la demande
// (import dynamique) afin de ne pas alourdir le chargement du sondage public.
//
// Format du fichier (un bloc par question) :
//   Q1
//   AR: نص السؤال
//   FR: Texte de la question
//   TYPE: single_choice | multiple_choice | text | number
//   REQUIRED: yes | no
//   ACTIVE: yes | no
//   OPTIONS:
//   - الخيار | Option | valeur_technique

const VALID_TYPES = ["single_choice", "multiple_choice", "text", "number"];
const TYPE_ALIASES = {
  single_choice: "single_choice", single: "single_choice", unique: "single_choice", "choix unique": "single_choice", "اختيار واحد": "single_choice",
  multiple_choice: "multiple_choice", multiple: "multiple_choice", multiples: "multiple_choice", "choix multiples": "multiple_choice", "choix multiple": "multiple_choice", "اختيارات متعددة": "multiple_choice",
  text: "text", texte: "text", libre: "text", "réponse libre": "text", "إجابة نصية": "text", نص: "text",
  number: "number", nombre: "number", "رقم": "number",
};
const YES = ["yes", "y", "oui", "true", "1", "نعم", "vrai"];

// Caractères de contrôle bidirectionnels que Word peut insérer autour du texte arabe.
const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const cleanLine = (value) => String(value || "").replace(BIDI_RE, "").replace(/\u00A0/g, " ").trim();

function slugify(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function exportQuestionsToDocx(questions, surveyTitle = "") {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const children = [];
  const run = (text, opts = {}) => new TextRun({ text: String(text ?? ""), font: "Arial", size: 22, ...opts });
  const line = (text, opts = {}) => new Paragraph({ spacing: { after: 80 }, children: [run(text, opts.run)], ...opts.paragraph });

  children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Questionnaire — الاستبيان", font: "Arial", bold: true, size: 36 })] }));
  if (surveyTitle) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run(surveyTitle, { italics: true, color: "5B687B" })] }));
  children.push(line("Mode d’emploi : modifiez ce fichier puis réimportez-le depuis l’espace d’administration. Gardez les mots-clés AR:, FR:, TYPE:, REQUIRED:, ACTIVE:, OPTIONS: ainsi que les lignes Q1, Q2… Une option s’écrit « - arabe | français | valeur ». Les questions déjà présentes (même texte) ne sont pas dupliquées.", { run: { color: "5B687B", size: 20 } }));
  children.push(line("طريقة الاستخدام: عدّل هذا الملف ثم أعد رفعه من لوحة المشرف. احتفظ بالكلمات AR: وFR: وTYPE: وREQUIRED: وACTIVE: وOPTIONS: وبأسطر Q1 وQ2… يُكتب الخيار هكذا «- العربية | الفرنسية | القيمة». لا يتم تكرار الأسئلة الموجودة مسبقًا.", { run: { color: "5B687B", size: 20, rightToLeft: true }, paragraph: { bidirectional: true, spacing: { after: 240 } } }));

  [...questions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).forEach((q, index) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, children: [new TextRun({ text: `Q${index + 1}`, font: "Arial", bold: true, size: 26, color: "1B4E8C" })] }));
    children.push(new Paragraph({ spacing: { after: 80 }, bidirectional: false, children: [run("AR: ", { bold: true }), new TextRun({ text: q.question_ar || "", font: "Arial", size: 22, rightToLeft: true })] }));
    children.push(line(`FR: ${q.question_fr || ""}`));
    children.push(line(`TYPE: ${q.question_type}`));
    children.push(line(`REQUIRED: ${q.required ? "yes" : "no"}`));
    children.push(line(`ACTIVE: ${q.active === false ? "no" : "yes"}`));
    if (["single_choice", "multiple_choice"].includes(q.question_type)) {
      children.push(line("OPTIONS:", { run: { bold: true } }));
      (q.options || []).forEach((option) => {
        children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [run("- "), new TextRun({ text: option.label_ar || "", font: "Arial", size: 22, rightToLeft: true }), run(` | ${option.label_fr || ""} | ${option.value || ""}`)] }));
      });
    }
  });

  const doc = new Document({ creator: "MDA", title: "Questionnaire", sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `questionnaire-${stamp}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const KEY_RE = /^(AR|FR|TYPE|REQUIRED|ACTIVE|OPTIONS)\s*[:：]\s*(.*)$/i;
const Q_RE = /^(?:Q|QUESTION|السؤال)\s*\d+\s*[:.)-]?\s*$/i;
const OPTION_RE = /^(?:[-•–—*▪●]|\d+[.)])\s*(.+)$/;

// Retourne { questions: [{question_ar, question_fr, question_type, required, active, options:[[ar, fr, value]]}], errors: [string] }
export async function parseQuestionsFromDocx(file) {
  const mammothModule = await import("mammoth/mammoth.browser");
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  const lines = String(value || "").split(/\r?\n/).map(cleanLine).filter(Boolean);

  const hasQLines = lines.some((l) => Q_RE.test(l));
  const blocks = [];
  let current = null;
  let inOptions = false;
  const startBlock = () => { current = { ar: "", fr: "", type: "", required: null, active: null, options: [] }; blocks.push(current); inOptions = false; };

  for (const text of lines) {
    if (Q_RE.test(text)) { startBlock(); continue; }
    const keyMatch = text.match(KEY_RE);
    if (keyMatch) {
      const key = keyMatch[1].toUpperCase();
      const val = cleanLine(keyMatch[2]);
      if (!current) { if (hasQLines) continue; startBlock(); }
      if (!hasQLines && key === "AR" && current.ar) startBlock();
      if (key === "AR") { current.ar = val; inOptions = false; }
      else if (key === "FR") { current.fr = val; inOptions = false; }
      else if (key === "TYPE") { current.type = val; inOptions = false; }
      else if (key === "REQUIRED") { current.required = val; inOptions = false; }
      else if (key === "ACTIVE") { current.active = val; inOptions = false; }
      else if (key === "OPTIONS") { inOptions = true; }
      continue;
    }
    if (current && inOptions) {
      const optionMatch = text.match(OPTION_RE);
      if (optionMatch) current.options.push(optionMatch[1]);
    }
  }

  const errors = [];
  const questions = [];
  blocks.forEach((block, index) => {
    const label = `Q${index + 1}`;
    if (!block.ar && !block.fr && !block.type && !block.options.length) return;
    if (!block.ar || !block.fr) { errors.push(`${label}: AR / FR manquant — النص بإحدى اللغتين ناقص`); return; }
    const type = TYPE_ALIASES[String(block.type || "").trim().toLowerCase()] || (block.type ? "" : (block.options.length ? "single_choice" : "text"));
    if (!VALID_TYPES.includes(type)) { errors.push(`${label}: TYPE invalide (${block.type}) — نوع غير صالح`); return; }
    const isChoice = ["single_choice", "multiple_choice"].includes(type);
    const usedValues = new Set();
    const options = [];
    if (isChoice) {
      block.options.forEach((raw, optionIndex) => {
        const parts = raw.split("|").map(cleanLine);
        const labelAr = parts[0] || "";
        const labelFr = parts[1] || parts[0] || "";
        if (!labelAr) return;
        let optionValue = slugify(parts[2] || labelFr) || `option_${optionIndex + 1}`;
        let candidate = optionValue; let suffix = 2;
        while (usedValues.has(candidate)) { candidate = `${optionValue}_${suffix}`; suffix += 1; }
        usedValues.add(candidate);
        options.push([labelAr, labelFr, candidate]);
      });
      if (!options.length) { errors.push(`${label}: aucune option — لا توجد خيارات`); return; }
    }
    questions.push({
      question_ar: block.ar,
      question_fr: block.fr,
      question_type: type,
      required: block.required === null ? true : YES.includes(String(block.required).trim().toLowerCase()),
      active: block.active === null ? true : YES.includes(String(block.active).trim().toLowerCase()),
      options,
    });
  });

  if (!blocks.length) errors.push("Aucune question reconnue dans ce fichier — لم يتم التعرف على أي سؤال في الملف");
  return { questions, errors };
}
