// Standalone check for a module checkout. The tools repository adds full schema validation.
import { readFileSync } from 'node:fs';

const dataDir = new URL('../public/data/', import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name + '.json', dataDir), 'utf8'));
const datasets = ['courses', 'lessons', 'knowledge-points', 'questions', 'exams',
  'cases', 'routes', 'glossary', 'faqs', 'tags'];
const searchTypes = { courses: 'course', lessons: 'lesson', 'knowledge-points': 'knowledge',
  questions: 'question', cases: 'case', routes: 'route', glossary: 'glossary', faqs: 'faq' };

function validate() {
  const meta = read('module');
  const data = {};
  const ids = {};
  const problems = [];
  const expectedIndex = new Set();
  for (const name of datasets) {
    const rows = read(name);
    if (!Array.isArray(rows)) throw new Error(name + '.json must contain an array');
    data[name] = rows;
    ids[name] = new Set();
    const slugs = new Set();
    const published = rows.filter((row) => row.editorialStatus !== 'draft');
    const key = name === 'knowledge-points' ? 'knowledgePoints' : name;
    if (meta.stats?.[key] !== published.length) problems.push(name + ': public count differs from module.json');

    for (const row of rows) {
      if (!row.id || ids[name].has(row.id)) problems.push(name + ': missing or duplicate id ' + row.id);
      ids[name].add(row.id);
      if (row.slug && slugs.has(row.slug)) problems.push(name + ': duplicate slug ' + row.slug);
      if (row.slug) slugs.add(row.slug);
    }
    if (searchTypes[name]) {
      for (const row of published) expectedIndex.add(searchTypes[name] + ':' + row.id);
    }
  }

  function references(source, field, target) {
    for (const row of data[source]) {
      const value = row[field];
      if (value === undefined || value === null || value === '') continue;
      for (const id of Array.isArray(value) ? value : [value]) {
        if (!ids[target].has(id)) problems.push(row.id + '.' + field + ': unknown ' + id);
      }
    }
  }

  references('courses', 'lessons', 'lessons');
  references('lessons', 'courseId', 'courses');
  references('lessons', 'knowledgePoints', 'knowledge-points');
  references('lessons', 'practiceQuestionIds', 'questions');
  references('questions', 'related_questions', 'questions');
  references('questions', 'knowledge_points', 'knowledge-points');
  references('exams', 'questionIds', 'questions');
  references('cases', 'knowledgePoints', 'knowledge-points');
  references('cases', 'relatedQuestionIds', 'questions');
  references('knowledge-points', 'relatedQuestions', 'questions');
  references('knowledge-points', 'relatedCases', 'cases');
  references('knowledge-points', 'glossary', 'glossary');

  for (const q of data.questions) {
    if (!q.type || !q.stem || !q.explanation || !q.difficulty || !(q.estimated_time > 0) ||
        !Array.isArray(q.options) || !Array.isArray(q.answer) || !q.answer.length ||
        !Array.isArray(q.tags) || !Array.isArray(q.knowledge_points)) {
      problems.push(q.id + ': missing question fields');
      continue;
    }
    if (!ids.courses.has(q.chapter) && !ids.lessons.has(q.chapter)) problems.push(q.id + ': unknown chapter ' + q.chapter);
    if (q.type === 'single' || q.type === 'multiple') {
      const keys = new Set(q.options.map((option) => option.key));
      if (keys.size < 2 || keys.size !== q.options.length || q.answer.some((key) => !keys.has(key)) ||
          new Set(q.answer).size !== q.answer.length || (q.type === 'single' && q.answer.length !== 1)) {
        problems.push(q.id + ': invalid choice options or answer');
      }
    }
    if (q.type === 'judge' && (q.answer.length !== 1 || !['T', 'F'].includes(q.answer[0]))) {
      problems.push(q.id + ': invalid true/false answer');
    }
  }

  const index = read('search-index');
  if (!Array.isArray(index)) throw new Error('search-index.json must contain an array');
  for (const entry of index) {
    const key = entry.type + ':' + entry.id;
    if (!entry.url || !entry.title || !expectedIndex.delete(key)) problems.push('Invalid search entry: ' + key);
  }
  for (const missing of expectedIndex) problems.push('Missing search entry: ' + missing);
  if (problems.length) throw new Error(problems.slice(0, 20).join('\n') + '\nTotal errors: ' + problems.length);
  console.log(meta.slug + ': data, published counts and ' + index.length + ' search entries validated');
}

try {
  validate();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
