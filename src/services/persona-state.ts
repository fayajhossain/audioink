import { BUILT_IN_PERSONAS } from '@/constants/personas';
import { Persona, RecordingType } from '@/types/fidelity';

let currentPersona: Persona = BUILT_IN_PERSONAS.professor;
let currentRecordingType: RecordingType = BUILT_IN_PERSONAS.professor.recordingTypes[0];
const listeners = new Set<() => void>();

export function getActivePersona(): Persona {
  return currentPersona;
}

export function getActiveRecordingType(): RecordingType {
  return currentRecordingType;
}

export function setActivePersonaAndType(personaId: string, typeId?: string): void {
  const p = BUILT_IN_PERSONAS[personaId] || BUILT_IN_PERSONAS.professor;
  currentPersona = p;
  const t = p.recordingTypes.find((item) => item.id === typeId) || p.recordingTypes[0];
  currentRecordingType = t;
  listeners.forEach((fn) => fn());
}

export function subscribePersonaChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
