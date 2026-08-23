import type { BodyMeasurementFilter } from "@/components/features/body-measurement/BodyMeasurementList";
import { createListUiStore } from "./list-ui-store";

const EMPTY_FILTER: BodyMeasurementFilter = {};

/**
 * Body-measurement list filter + pagination persists across `/measurements` ↔
 * route/tab switches.
 */
export const useMeasurementListStore =
  createListUiStore<BodyMeasurementFilter>(EMPTY_FILTER);