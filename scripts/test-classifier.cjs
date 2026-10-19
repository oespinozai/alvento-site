const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/mdr-class-check/index.html'), 'utf8');
const compute = html.slice(html.indexOf('    function computeResult()'), html.indexOf('    function showResult()'));
assert.ok(compute.includes('function computeResult()'), 'Classifier source must exist');
const questionSource = html.slice(html.indexOf('    const questions = ['), html.indexOf('    let currentStep ='));
const questions = vm.runInNewContext(questionSource + '\nquestions;');
const rank = { I: 0, IIa: 1, IIb: 2, III: 3 };
function classify(values) {
  const answers = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]));
  return vm.runInNewContext(compute + '\ncomputeResult();', { answers });
}
let combinations = [{}];
for (const question of questions) combinations = combinations.flatMap(values => question.options.map(option => ({ ...values, [question.id]: option.value })));
let activeImplantCases = 0, medicinalCases = 0;
for (const values of combinations) {
  const result = classify(values);
  assert.ok(Object.hasOwn(rank, result.cls), 'Every valid combination returns a known class');
  if (values.invasiveness === 'active_impl') {
    assert.equal(result.cls, 'III', `Active implantable result was lowered: ${JSON.stringify(values)}`);
    activeImplantCases++;
  }
  if (values.biological === 'medicinal') {
    assert.equal(result.cls, 'III', `Medicinal-substance result was lowered: ${JSON.stringify(values)}`);
    medicinalCases++;
  }
  if (values.risk === 'low') {
    const medium = classify({ ...values, risk: 'medium' });
    const high = classify({ ...values, risk: 'high' });
    assert.ok(rank[medium.cls] >= rank[result.cls] && rank[high.cls] >= rank[medium.cls], `Increasing severity lowered the class: ${JSON.stringify(values)}`);
  }
  const longTerm = classify({ ...values, duration: 'long' });
  assert.ok(rank[longTerm.cls] >= rank[result.cls], `Long-term adjustment lowered the class: ${JSON.stringify(values)}`);
}
const example = { duration: 'transient', invasiveness: 'active_impl', energy: 'passive', biological: 'no_bio', risk: 'high' };
const fixed = classify(example);
assert.equal(fixed.cls, 'III');
assert.ok(!fixed.basis.some(reason => reason.startsWith('Risk uplift')), 'Do not claim an uplift when the class was unchanged');
assert.equal(classify({ ...example, duration: 'long' }).cls, 'III');
console.log(JSON.stringify({ status: 'pass', combinations: combinations.length, activeImplantCases, medicinalCases, severityMonotonicityCases: combinations.length / 3, durationMonotonicityCases: combinations.length, scope: 'Software regression invariants; not regulatory validation' }));
