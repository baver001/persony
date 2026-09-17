export type PersonaRelationshipRecord = {
  userId: string;
  personaId: string;
  firstInteractionAt: string;
  lastInteractionAt: string;
  relationshipSummary: string | null;
  interactionPreferencesJson: string | null;
};

type Row = {
  user_id: string;
  persona_id: string;
  first_interaction_at: string;
  last_interaction_at: string;
  relationship_summary: string | null;
  interaction_preferences_json: string | null;
};

function rowToRecord(row: Row): PersonaRelationshipRecord {
  return {
    userId: row.user_id,
    personaId: row.persona_id,
    firstInteractionAt: row.first_interaction_at,
    lastInteractionAt: row.last_interaction_at,
    relationshipSummary: row.relationship_summary,
    interactionPreferencesJson: row.interaction_preferences_json,
  };
}

export async function getPersonaRelationship(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<PersonaRelationshipRecord | null> {
  const row = await db
    .prepare(
      `SELECT * FROM persona_relationships WHERE user_id = ? AND persona_id = ? LIMIT 1`
    )
    .bind(userId, personaId)
    .first<Row>();
  return row ? rowToRecord(row) : null;
}

export async function upsertPersonaRelationshipTouch(
  db: D1Database,
  userId: string,
  personaId: string,
  now: string
): Promise<void> {
  const existing = await getPersonaRelationship(db, userId, personaId);
  if (existing) {
    await db
      .prepare(
        `UPDATE persona_relationships
         SET last_interaction_at = ?, updated_at = ?
         WHERE user_id = ? AND persona_id = ?`
      )
      .bind(now, now, userId, personaId)
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO persona_relationships (
        user_id, persona_id, first_interaction_at, last_interaction_at,
        relationship_summary, interaction_preferences_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`
    )
    .bind(userId, personaId, now, now, now, now)
    .run();
}

export async function listPersonaRelationshipsForUser(
  db: D1Database,
  userId: string
): Promise<PersonaRelationshipRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM persona_relationships
       WHERE user_id = ?
       ORDER BY last_interaction_at DESC`
    )
    .bind(userId)
    .all<Row>();
  return (result.results ?? []).map(rowToRecord);
}
