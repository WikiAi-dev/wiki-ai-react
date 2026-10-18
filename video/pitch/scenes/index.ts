import type { ComponentType } from "react";
import { Close, Economics, Market, Pricing } from "./business";
import { Evidence, Problem, Title } from "./opening";
import { Awards, Proof, Solution } from "./solution";
import { AfterCall, Inbound, Operator } from "./telephony";
import { Cjm, Persona } from "./user";

/** Scene component for each script entry, by id. */
export const SCENES: Record<string, ComponentType> = {
  title: Title,
  problem: Problem,
  evidence: Evidence,
  solution: Solution,
  proof: Proof,
  awards: Awards,
  persona: Persona,
  cjm: Cjm,
  inbound: Inbound,
  operator: Operator,
  aftercall: AfterCall,
  economics: Economics,
  pricing: Pricing,
  market: Market,
  close: Close,
};
