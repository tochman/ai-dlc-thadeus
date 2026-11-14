// A saved plan's name (EPIC-09 US-0903): lowercase words joined by hyphens. Shared so the Plans view checks a
// name as it is typed with the same rule main checks before `aidlc engine scope save` runs.
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validPlanName(name) {
  return typeof name === 'string' && name.length <= 64 && NAME.test(name);
}
