import { useEffect, useState } from "react";
import type {
  BrickInteractionMode,
  IovTopologyData,
  RegionId,
  ToggleId,
} from "@/game/iov/IovTopologyScene";
import type { BlockPeopleSummary } from "@/game/iov/BlockInteriorScene";
import type {
  PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
import type {
  ValueLogDraft,
  ValueLogSummary,
  WizardStep,
} from "@/game/iov/ValueLogScene";
import type { SemanticZoomLevel } from "@/game/iov/IovSemanticZoomController";
import {
  type IovValues,
  formatIovValue,
} from "@/game/iov/iovValues";

interface IovTopologyPanelProps {
  data: IovTopologyData;
  selectedRegionId: RegionId;
  toggles: Record<ToggleId, boolean>;
  phaseHeadline: string;
  presentationMode: boolean;
  values: IovValues;
  meaningText: string;
  transferredCount: number;
  isMobile: boolean;
  semanticLevel: SemanticZoomLevel;
  selectedBrickLabel: string | null;
  canOpenBrick: boolean;
  blockSummary: BlockPeopleSummary | null;
  personSummary: PersonIdentitySummary | null;
  valueLogDraft: ValueLogDraft;
  valueLogSummary: ValueLogSummary | null;
  valueLogStep: WizardStep;
  interactionMode: BrickInteractionMode;
  onToggle: (toggleId: ToggleId) => void;
  onBuild: (regionId: RegionId) => void;
  onOpenBrick: () => void;
  onOpenPerson: () => void;
  onBackSemantic: () => void;
  onInteractionModeChange: (mode: BrickInteractionMode) => void;
  onTogglePresentationMode: () => void;
  onValueLogDraftChange: (patch: Partial<ValueLogDraft>) => void;
  onValueLogNext: () => void;
  onValueLogPrev: () => void;
  onValueLogCommit: () => void;
  onOpenValueLog: () => void; // Added for Person Identity view
}

const IovTopologyPanel = ({
  data,
  selectedRegionId,
  toggles,
  phaseHeadline,
  presentationMode,
  values,
  meaningText,
  transferredCount,
  isMobile,
  semanticLevel,
  selectedBrickLabel,
  canOpenBrick,
  blockSummary,
  personSummary,
  valueLogDraft,
  valueLogSummary,
  valueLogStep,
  interactionMode,
  onToggle,
  onBuild,
  onOpenBrick,
  onOpenPerson,
  onBackSemantic,
  onInteractionModeChange,
  onTogglePresentationMode,
  onValueLogDraftChange,
  onValueLogNext,
  onValueLogPrev,
  onValueLogCommit,
  onOpenValueLog,
}: IovTopologyPanelProps) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  useEffect(() => {
    setMobileExpanded(!isMobile);
  }, [isMobile]);

  const selected = data.regions.find((region) => region.id === selectedRegionId);
  const marketCash =
    values.market.total ??
    values.market.cash_equities ??
    null;
  const marketWithDerivatives =
    marketCash !== null && values.market.derivatives_notional !== null
      ? marketCash + values.market.derivatives_notional
      : null;
  const legendItems = [
    { id: "market", label: "Market", color: "#1f7a34" },
    { id: "state", label: "State", color: "#c43a2f" },
    { id: "community", label: "Community", color: "#d9b114" },
    { id: "bridge", label: "Bridge", color: "#5f6670" },
  ] as const;

  return (
    <div
      className={`iov-panel ${presentationMode ? "is-presentation" : ""} ${
        isMobile ? "is-mobile" : ""
      } ${isMobile && !mobileExpanded ? "is-collapsed" : ""}`}
    >
      <div className="iov-panel-header">
        <div className="iov-panel-kicker">What is the System and its Value?</div>
        <div className="iov-panel-header-actions">
          <button
            type="button"
            className="iov-presentation-toggle"
            onClick={onTogglePresentationMode}
          >
            {presentationMode ? "Exit Presentation" : "Presentation Mode"}
          </button>
          {isMobile && (
            <button
              type="button"
              className="iov-mobile-expand"
              onClick={() => setMobileExpanded((prev) => !prev)}
            >
              {mobileExpanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
      </div>
      {isMobile && (
        <div className="iov-mobile-summary">
          <strong>{selected?.label ?? "Region"}</strong>
          <span>Reclaimed bricks: {transferredCount}</span>
        </div>
      )}
      <div className="iov-mobile-build-row">
        <button type="button" onClick={() => onBuild("market")}>
          Market
        </button>
        <button type="button" onClick={() => onBuild("state")}>
          State
        </button>
        <button type="button" onClick={() => onBuild("community")}>
          Community
        </button>
        <button type="button" onClick={() => onBuild("crony_bridge")}>
          Bridge
        </button>
      </div>
      {isMobile && semanticLevel === "topology" && (
        <div className="iov-mobile-semantic-row">
          <button type="button" onClick={onOpenBrick} disabled={!canOpenBrick}>
            Open Organization
          </button>
          <button
            type="button"
            className={interactionMode === "inspect" ? "is-active" : ""}
            onClick={() => onInteractionModeChange("inspect")}
          >
            Inspect
          </button>
          <button
            type="button"
            className={interactionMode === "reclaim" ? "is-active" : ""}
            onClick={() => onInteractionModeChange("reclaim")}
          >
            Reclaim
          </button>
        </div>
      )}
      {isMobile && semanticLevel === "valuelog" && (
        <>
          <div className="iov-mobile-person-row">
            <button type="button" onClick={onBackSemantic}>
              Person
            </button>
            <button type="button" onClick={onValueLogPrev}>
              Prev
            </button>
            <button type="button" onClick={onValueLogNext}>
              Next
            </button>
            <button type="button" onClick={onValueLogCommit}>
              Commit
            </button>
          </div>
          {valueLogSummary && (
            <div className="iov-mobile-layer-rail" aria-label="Time slice step">
              <span className="iov-mobile-layer-pill is-active">{valueLogSummary.stepLabel}</span>
            </div>
          )}
        </>
      )}
      <div className="iov-panel-content">
      <div className="iov-phase-headline">{phaseHeadline}</div>
      <div className="iov-panel-title">{selected?.label ?? "Region"}</div>
      <div className="iov-panel-definition">{selected?.notes}</div>
      <div className="iov-panel-meaning">{meaningText}</div>
      <div className="iov-panel-transfer-tip">
        Tip: click upper bricks on Market, State, or Bridge to reclaim them into Community.
      </div>
      <div className="iov-panel-transfer-count">Reclaimed bricks: {transferredCount}</div>

      <div className="iov-panel-section-label">Legend</div>
      <div className="iov-panel-legend">
        {legendItems.map((item) => (
          <div key={item.id} className="iov-panel-legend-item">
            <span
              className="iov-panel-legend-swatch"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="iov-panel-section-label">Values ({values.units})</div>
      <div className="iov-panel-values">
        <div className="iov-panel-value-line">
          <strong>Market total:</strong> {formatIovValue(values.market.total, values.units)}
        </div>
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Cash equities: {formatIovValue(values.market.cash_equities, values.units)}
          </div>
        )}
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Bonds: {formatIovValue(values.market.bonds, values.units)}
          </div>
        )}
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Derivatives notional: {formatIovValue(values.market.derivatives_notional, values.units)}
          </div>
        )}
        <div className="iov-panel-value-subline">
          Visual market scale (cash + derivatives): {formatIovValue(marketWithDerivatives, values.units)}
        </div>
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Market split guide: below white band = cash, above white band = derivatives.
          </div>
        )}
        <div className="iov-panel-value-line">
          <strong>State total (GDP):</strong> {formatIovValue(values.state.total, values.units)}
        </div>
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Global GDP: {formatIovValue(values.state.global_gdp, values.units)}
          </div>
        )}
        <div className="iov-panel-value-line">
          <strong>Community total:</strong> {formatIovValue(values.community.total, values.units)}
        </div>
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Nonprofit sector: {formatIovValue(values.community.nonprofit_sector_estimate, values.units)}
          </div>
        )}
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Co-ops / mutuals: {formatIovValue(values.community.coops_mutuals_estimate, values.units)}
          </div>
        )}
        {!presentationMode && (
          <div className="iov-panel-value-subline">
            Household unpaid: {formatIovValue(values.community.household_unpaid_estimate, values.units)}
          </div>
        )}
      </div>

      <div className="iov-panel-section-label">Active Toggles</div>
      <div className="iov-panel-tags">
        {data.toggles.map((toggle) => (
          <span
            key={toggle.id}
            className={`iov-tag ${toggles[toggle.id] ? "is-active" : ""}`}
          >
            {toggle.label}
          </span>
        ))}
      </div>

      <div className="iov-panel-buttons">
        {data.toggles.map((toggle) => (
          <button key={toggle.id} type="button" onClick={() => onToggle(toggle.id)}>
            {toggles[toggle.id] ? "Disable" : "Enable"} {toggle.label}
          </button>
        ))}
      </div>

      <div className="iov-panel-section-label">Build Formation</div>
      <div className="iov-panel-focus-buttons">
        <button type="button" onClick={() => onBuild("market")}>
          Market
        </button>
        <button type="button" onClick={() => onBuild("state")}>
          State
        </button>
        <button type="button" onClick={() => onBuild("community")}>
          Community
        </button>
        <button type="button" onClick={() => onBuild("crony_bridge")}>
          Bridge
        </button>
      </div>

      <div className="iov-panel-section-label">Semantic Zoom</div>
      <div className="iov-panel-value-subline">
        Level: <strong>{formatSemanticLevel(semanticLevel)}</strong>
      </div>
      {semanticLevel === "topology" && (
        <div className="iov-panel-value-subline">
          Organization mode: <strong>{interactionMode}</strong>
        </div>
      )}
      {semanticLevel === "topology" ? (
        <>
          <div className="iov-panel-value-subline">
            Selected organization unit: {selectedBrickLabel ?? "None"}
          </div>
          <div className="iov-panel-buttons">
            <button type="button" onClick={onOpenBrick} disabled={!canOpenBrick}>
              Open Organization
            </button>
            <button
              type="button"
              className={interactionMode === "inspect" ? "is-active" : ""}
              onClick={() => onInteractionModeChange("inspect")}
            >
              Inspect
            </button>
            <button
              type="button"
              className={interactionMode === "reclaim" ? "is-active" : ""}
              onClick={() => onInteractionModeChange("reclaim")}
            >
              Reclaim
            </button>
          </div>
        </>
      ) : (
        <>
          {semanticLevel === "block" && blockSummary && (
            <div className="iov-panel-values">
              <div className="iov-panel-value-line">
                <strong>{blockSummary.brickLabel}</strong>
              </div>
              <div className="iov-panel-value-subline">
                People count: {blockSummary.peopleCount}
              </div>
              <div className="iov-panel-value-subline">
                Hovered person: {blockSummary.hoveredPersonId ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Selected person: {blockSummary.selectedPersonId ?? "None"}
              </div>
              {blockSummary.selectedPersonId && (
                <button
                  type="button"
                  className="iov-btn-action"
                  onClick={onOpenPerson}
                  style={{ marginTop: "8px", width: "100%" }}
                >
                  Inspect Person
                </button>
              )}
              <div className="iov-panel-value-subline">
                Profile mix:{" "}
                {Object.entries(blockSummary.profileMix)
                  .map(([profile, count]) => `${profile} (${count})`)
                  .join(", ")}
              </div>
            </div>
          )}
          {semanticLevel === "person" && personSummary && (
            <div className="iov-panel-values">
              <div className="iov-panel-value-line">
                <strong>{personSummary.personId}</strong>
              </div>
              <div className="iov-panel-value-subline">
                Identity build controls are in the center scene card.
              </div>
              <div className="iov-panel-value-subline">
                Build progress:{" "}
                {personSummary.identityBuildMode
                  ? `${Math.max(0, personSummary.identityBuildLayerIndex + 1)} / ${
                      personSummary.identityBuildLayerCount
                    }${personSummary.identityBuildComplete ? " (complete)" : ""}`
                  : "Not started"}
              </div>
              <div className="iov-panel-value-subline">
                Active build layer: {personSummary.identityBuildLayerLabel ?? "None"}
              </div>
              <div className="iov-panel-buttons" style={{ marginTop: "12px", marginBottom: "12px" }}>
                   <button
                   className="iov-btn-action"
                    onClick={onOpenValueLog}
                    type="button"
                    >
                        Create Value Log (Action)
                    </button>
              </div>
              <div className="iov-panel-layer-rail">
                {personSummary.layerLabels.map((layer) => {
                  const isActive =
                    layer === personSummary.selectedLayer ||
                    layer === personSummary.hoveredLayer ||
                    layer === personSummary.identityBuildLayerLabel;
                  return (
                    <span
                      key={layer}
                      className={`iov-panel-layer-pill ${isActive ? "is-active" : ""}`}
                    >
                      {layer}
                    </span>
                  );
                })}
              </div>
              <div className="iov-panel-value-subline">
                Layer hovered: {personSummary.hoveredLayer ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Facet hovered: {personSummary.hoveredFacet ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Layer selected: {personSummary.selectedLayer ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Facet selected: {personSummary.selectedFacet ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Wellbeing score: {personSummary.wellbeingScore.toFixed(3)}
              </div>
              <div className="iov-panel-value-subline">
                Aura strength: {personSummary.auraStrength.toFixed(3)}
              </div>
            </div>
          )}
          {semanticLevel === "valuelog" && valueLogSummary && (
            <div className="iov-panel-values">
              <div className="iov-panel-value-line">
                <strong>Time Slice Composer</strong>
              </div>
              <div className="iov-panel-value-subline">
                Step: {valueLogSummary.stepLabel}
              </div>
              <div className="iov-panel-value-subline">
                Tip: click scene elements directly. Next/Prev are optional.
              </div>
              <div className="iov-panel-mode-toggle iov-panel-mode-toggle-compact">
                <button type="button" onClick={onValueLogPrev}>
                  Prev
                </button>
                <button type="button" onClick={onValueLogNext}>
                  Next
                </button>
                <button type="button" onClick={onValueLogCommit}>
                  Commit Time Slice
                </button>
              </div>
              <div className="iov-panel-log-chain">
                {valueLogStep === "select_time" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">1) ~ValueCaptureProtocol / ~~TimeSlice</div>
                    <label className="iov-field-label">
                      Start
                      <input
                        className="iov-field-input"
                        type="datetime-local"
                        value={valueLogDraft.startTime}
                        onChange={(event) =>
                          onValueLogDraftChange({ startTime: event.target.value })
                        }
                      />
                    </label>
                    <label className="iov-field-label">
                      End
                      <input
                        className="iov-field-input"
                        type="datetime-local"
                        value={valueLogDraft.endTime}
                        onChange={(event) =>
                          onValueLogDraftChange({ endTime: event.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
                {valueLogStep === "select_wellbeing" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">3) ~WellbeingProtocol / ~~Context</div>
                    <label className="iov-field-label">
                      Primary node
                      <select
                        className="iov-field-input"
                        value={valueLogDraft.wellbeingNode}
                        onChange={(event) =>
                          onValueLogDraftChange({
                            wellbeingNode: event.target.value as ValueLogDraft["wellbeingNode"],
                          })
                        }
                      >
                        <option value="~~Physiology">Physiology</option>
                        <option value="~~Emotion">Emotion</option>
                        <option value="~~Feeling">Feeling</option>
                        <option value="~~Thought">Thought</option>
                        <option value="~~Habit">Habit</option>
                        <option value="~~Performance">Performance</option>
                      </select>
                    </label>
                    <label className="iov-field-label">
                      Signal label
                      <input
                        className="iov-field-input"
                        value={valueLogDraft.signalLabel}
                        onChange={(event) =>
                          onValueLogDraftChange({ signalLabel: event.target.value })
                        }
                      />
                    </label>
                    <label className="iov-field-label">
                      Signal score ({valueLogDraft.signalScore.toFixed(2)})
                      <input
                        className="iov-field-range"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={valueLogDraft.signalScore}
                        onChange={(event) =>
                          onValueLogDraftChange({ signalScore: Number(event.target.value) })
                        }
                      />
                    </label>
                  </div>
                )}
                {valueLogStep === "select_performance" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">4) ~SAOcommons activation (Performance only)</div>
                    {valueLogDraft.wellbeingNode === "~~Performance" ? (
                      <>
                        <label className="iov-field-label">
                          Skill application
                          <input
                            className="iov-field-input"
                            value={valueLogDraft.skillApplication}
                            onChange={(event) =>
                              onValueLogDraftChange({ skillApplication: event.target.value })
                            }
                          />
                        </label>
                        <div className="iov-panel-checkbox-row">
                          <label>
                            <input
                              type="checkbox"
                              checked={valueLogDraft.learningTag}
                              onChange={(event) =>
                                onValueLogDraftChange({ learningTag: event.target.checked })
                              }
                            />
                            Learning
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={valueLogDraft.earningTag}
                              onChange={(event) =>
                                onValueLogDraftChange({ earningTag: event.target.checked })
                              }
                            />
                            Earning
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={valueLogDraft.orgBuildingTag}
                              onChange={(event) =>
                                onValueLogDraftChange({ orgBuildingTag: event.target.checked })
                              }
                            />
                            OrgBuilding
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="iov-panel-value-subline">
                        Current wellbeing node is non-Performance, so SAOcommons remains gated off.
                      </div>
                    )}
                  </div>
                )}
                {valueLogStep === "show_outcome" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">
                      4) Outcome
                    </div>
                    <div className="iov-panel-value-subline">
                      SAOcommons: {valueLogSummary.outcome.saocommonsEnabled ? "Activated" : "Not activated"}
                    </div>
                    <div className="iov-panel-value-subline">
                      Domains: {valueLogSummary.outcome.saocommonsDomains.map((d) => d.replace("~~", "")).join(", ") || "None"}
                    </div>
                    <div className="iov-panel-value-subline">
                      Wellbeing delta: {formatSigned(valueLogSummary.outcome.wellbeingDelta)}
                    </div>
                    <div className="iov-panel-value-subline">
                      Aura delta: {formatSigned(valueLogSummary.outcome.auraDelta)}
                    </div>
                    <div className="iov-panel-value-subline">
                      IdentityState delta: {formatSigned(valueLogSummary.outcome.identityStateDelta)}
                    </div>
                    <div className="iov-panel-value-subline">
                      Committed logs in this session: {valueLogSummary.committedCount}
                    </div>
                  </div>
                )}
              </div>
              <div className="iov-panel-value-subline">
                Active node: {valueLogDraft.wellbeingNode.replace("~~", "")}
              </div>
              <div className="iov-panel-value-subline">
                Signal: {valueLogDraft.signalLabel} ({valueLogDraft.signalScore.toFixed(2)})
              </div>
            </div>
          )}
          <div className="iov-panel-buttons">
            <button type="button" onClick={onBackSemantic}>
              Back
            </button>
          </div>
        </>
      )}

      <div className="iov-panel-shortcuts">Shortcuts: 1 Market, 2 State, 3 Community, 4 Bridge</div>
      </div>
    </div>
  );
};

const formatSigned = (value: number) => {
  const rounded = value.toFixed(3);
  return value > 0 ? `+${rounded}` : rounded;
};

const formatSemanticLevel = (level: SemanticZoomLevel) => {
  switch (level) {
    case "topology":
      return "System";
    case "block":
      return "Organization";
    case "person":
      return "Person";
    case "valuelog":
      return "Time Slice";
    case "impact":
      return "Impact";
    case "orgimpact":
      return "Org Impact";
    default:
      return level;
  }
};

export default IovTopologyPanel;
