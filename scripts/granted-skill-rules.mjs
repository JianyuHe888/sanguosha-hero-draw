const ACQUISITION_TRIGGERS = [
  /获得技能/g,
  /视为拥有技能/g,
  /获得以下技能(?:之一)?/g,
  /获得对应的技能/g,
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function acquisitionChunks(rawDescription) {
  const source = String(rawDescription ?? "");
  const starts = [];
  for (const pattern of ACQUISITION_TRIGGERS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      starts.push({ index: match.index, start: match.index + match[0].length });
    }
  }

  return starts
    .sort((left, right) => left.index - right.index)
    .map(({ start }) => {
      const tail = source.slice(start);
      const stop = tail.search(/[。；]|[②③④⑤⑥⑦⑧⑨]/);
      return stop === -1 ? tail : tail.slice(0, stop);
    });
}

export function extractGrantReferences(rawDescription) {
  const references = [];
  for (const chunk of acquisitionChunks(rawDescription)) {
    for (const match of chunk.matchAll(/data-name="([^"]+)@"/g)) {
      references.push(match[1]);
    }
    for (const match of chunk.matchAll(/“([^”]+)”/g)) {
      references.push(match[1]);
    }
  }
  return unique(references);
}

function normalizeRow(row) {
  return {
    id: row.id || row.wikiName || row.name,
    name: row.name,
    description: row.description ?? "",
    rawDescription: row.rawDescription ?? row.description ?? "",
    order: row.order ?? 999,
  };
}

export function classifyHeroSkills(ownedSkills, allSkillRows) {
  const allRows = allSkillRows.map(normalizeRow);
  const globalById = new Map(allRows.map((row) => [row.id, row]));
  const globalByName = new Map();
  for (const row of allRows) {
    const current = globalByName.get(row.name) ?? [];
    current.push(row);
    globalByName.set(row.name, current);
  }

  const result = ownedSkills.map((skill) => ({
    ...normalizeRow(skill),
    kind: "base",
    grants: [],
    grantedBy: [],
  }));
  const resultById = new Map(result.map((skill) => [skill.id, skill]));
  const ownedByName = new Map(result.map((skill) => [skill.name, skill]));

  const resolve = (reference) => {
    if (globalById.has(reference)) return globalById.get(reference);
    const referenceName = reference.split("/")[0];
    if (ownedByName.has(referenceName)) return ownedByName.get(referenceName);
    const candidates = globalByName.get(referenceName) ?? [];
    return candidates.find((row) => row.id === referenceName) ?? candidates[0] ?? null;
  };

  for (let index = 0; index < result.length; index += 1) {
    const source = result[index];
    for (const reference of extractGrantReferences(source.rawDescription)) {
      const resolved = resolve(reference);
      if (!resolved) continue;
      let target = resultById.get(resolved.id) ?? ownedByName.get(resolved.name);
      if (!target) {
        target = {
          ...normalizeRow(resolved),
          kind: "granted",
          grants: [],
          grantedBy: [],
        };
        result.push(target);
        resultById.set(target.id, target);
      }
      if (target.id === source.id) continue;
      source.grants = unique([...source.grants, target.id]);
      target.grantedBy = unique([...target.grantedBy, source.id]);
      target.kind = "granted";
    }
  }

  validateSkillGraph(result);
  return result.map(({ rawDescription: _rawDescription, order: _order, ...skill }) => skill);
}

export function validateSkillGraph(skills) {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  for (const skill of skills) {
    for (const targetId of skill.grants) {
      if (!byId.has(targetId)) {
        throw new Error(`技能 ${skill.name} 指向不存在的附加技能 ${targetId}`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (skillId) => {
    if (visiting.has(skillId)) throw new Error(`附加技能关系存在循环：${skillId}`);
    if (visited.has(skillId)) return;
    visiting.add(skillId);
    for (const targetId of byId.get(skillId)?.grants ?? []) visit(targetId);
    visiting.delete(skillId);
    visited.add(skillId);
  };
  for (const skill of skills) visit(skill.id);
  return true;
}
