/**
 * The night narrator: a short spoken line when the night falls, each role is
 * called, and the morning comes. Each moment has several wordings, picked at
 * random without repeating the last one, so it doesn't get tiresome.
 *
 * Ukrainian lines are recorded files in /public/voice/uk (made with a speech
 * synthesizer; replace any file with a real recording of the same name).
 * English uses the browser's own voice. Off when the "Night voice" setting is off.
 */
import { getPrefs } from "../prefs";

export type NarratorCue = "night" | "mafia" | "don" | "sheriff" | "doctor" | "morning";

/** How many recorded wordings each cue has in /public/voice/uk/<cue>-<n>.mp3. */
const UK_FILES: Record<NarratorCue, number> = { night: 5, mafia: 4, don: 3, sheriff: 3, doctor: 3, morning: 4 };

const EN_LINES: Record<NarratorCue, string[]> = {
  night: ["The town falls asleep.", "Night falls on the town. Everyone sleeps.", "The lights go out. The town falls asleep."],
  mafia: ["The mafia wakes up.", "Mafia, open your eyes. Choose your target.", "Mafia, your time has come."],
  don: ["The mafia sleeps. The Don wakes up.", "The Don wakes up and looks for the Sheriff."],
  sheriff: ["The Don sleeps. The Sheriff wakes up.", "Sheriff, who do you check tonight?"],
  doctor: ["The Sheriff sleeps. The Doctor wakes up.", "Doctor, who do you save tonight?"],
  morning: ["The town wakes up.", "Morning has come. The town wakes up.", "Good morning, town. Let's see who is still with us."],
};

const last = new Map<NarratorCue, number>();
let playing: HTMLAudioElement | null = null;

function pick(cue: NarratorCue, count: number): number {
  const prev = last.get(cue);
  let n = 1 + Math.floor(Math.random() * count);
  if (count > 1 && n === prev) n = (n % count) + 1;
  last.set(cue, n);
  return n;
}

/** Speaks one line for this moment. `force` plays even when the setting is off (the settings test button). */
export function narrate(cue: NarratorCue, lang: string, force = false) {
  if (typeof window === "undefined" || (!force && !getPrefs().voice)) return;
  if (lang === "uk") {
    const n = pick(cue, UK_FILES[cue]);
    playing?.pause();
    const audio = new Audio(`/voice/uk/${cue}-${n}.mp3`);
    audio.volume = 0.85;
    playing = audio;
    void audio.play().catch(() => {}); // blocked until the page has been clicked once
    return;
  }
  const synth = window.speechSynthesis;
  if (!synth) return;
  const lines = EN_LINES[cue];
  const utter = new SpeechSynthesisUtterance(lines[pick(cue, lines.length) - 1]);
  utter.lang = "en-US";
  utter.rate = 0.92;
  utter.pitch = 0.85;
  synth.cancel();
  synth.speak(utter);
}
