"use client";
// What a lab room knows about the class it's in (set by the board's Lab panel):
// the teacher can set a practical; a learner can hand in their plan and gets
// the teacher's reply. Outside a class (or for practice) it's all off.
import { createContext, useContext } from "react";
import type { Assignment, PlanReport, Reply } from "@/lib/lab/room/planShare";

export type RoomClass = {
  host: boolean; live: boolean;
  assignment: Assignment | null;
  setAssignment?: (a: Assignment | null) => void;                              // teacher
  handIn?: (r: Omit<PlanReport, "by" | "name" | "v" | "at">) => void;          // learner
  handedIn?: number | null;                                                   // learner: when
  reply?: Reply | null;                                                       // learner: the teacher's reply
};
export const RoomClassContext = createContext<RoomClass>({ host: true, live: false, assignment: null });
export const useRoomClass = () => useContext(RoomClassContext);
