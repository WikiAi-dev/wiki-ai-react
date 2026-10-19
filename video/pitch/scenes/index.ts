import type { ComponentType } from "react";
import { Cost, OnPrem, Onboarding, Pnl, Rivals, Sensitivity } from "./appendix";
import { Close, Market, Pricing, Unit } from "./business";
import { ClientRoi, Plan, Round } from "./investor";
import { Evidence, Problem, Title } from "./opening";
import { Awards, Proof, Solution } from "./solution";
import { AfterCall, Inbound, Operator } from "./telephony";
import { Cjm, Persona } from "./user";

/** Scene component for each script and appendix entry, by id. */
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
  pricing: Pricing,
  client: ClientRoi,
  unit: Unit,
  market: Market,
  plan: Plan,
  round: Round,
  close: Close,
  cost: Cost,
  onboarding: Onboarding,
  pnl: Pnl,
  sensitivity: Sensitivity,
  rivals: Rivals,
  onprem: OnPrem,
};
