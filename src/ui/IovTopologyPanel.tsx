import { useEffect, useState } from "react";
import type {
  IovTopologyData,
  RegionId,
  ToggleId,
} from "@/game/iov/IovTopologyScene";
import type { BlockPeopleSummary } from "@/game/iov/BlockInteriorScene";
import type {
  PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
import {
  SAOCOMMONS_DOMAIN_PROMPTS,
  VALUE_CAPTURE_ACTIVITY_TEMPLATES,
  VALUE_CAPTURE_PROOF_TEMPLATES,
  WELLBEING_INTENSITY_PROMPTS,
  type ValueLogDraft,
  type ValueLogSummary,
  type WizardStep,
} from "@/game/iov/ValueLogModel";
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
  topologyActivated: boolean;
  nextTopologyBuildRegion: RegionId | null;
  selectedBrickLabel: string | null;
  canOpenBrick: boolean;
  blockSummary: BlockPeopleSummary | null;
  personSummary: PersonIdentitySummary | null;
  valueLogDraft: ValueLogDraft;
  valueLogSummary: ValueLogSummary | null;
  valueLogStep: WizardStep;
  onToggle: (toggleId: ToggleId) => void;
  onBuild: (regionId: RegionId) => void;
  onOpenBrick: () => void;
  onOpenPerson: () => void;
  onBackSemantic: () => void;
  onTogglePresentationMode: () => void;
  onValueLogDraftChange: (patch: Partial<ValueLogDraft>) => void;
  onValueLogCommit: () => void;
  onOpenValueLog: () => void; // Added for Person Identity view
  canEmpowerCommunity: boolean;
  empowerLabel: string;
  onEmpowerCommunity: () => void;
  canReplaySystemImpact: boolean;
  onReplaySystemImpact: () => void;
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
  topologyActivated,
  nextTopologyBuildRegion,
  selectedBrickLabel,
  canOpenBrick,
  blockSummary,
  personSummary,
  valueLogDraft,
  valueLogSummary,
  valueLogStep,
  onToggle,
  onBuild,
  onOpenBrick,
  onOpenPerson,
  onBackSemantic,
  onTogglePresentationMode,
  onValueLogDraftChange,
  onValueLogCommit,
  onOpenValueLog,
  canEmpowerCommunity,
  empowerLabel,
  onEmpowerCommunity,
  canReplaySystemImpact,
  onReplaySystemImpact,
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
    { id: "market", label: "Market", color: "#1f4c8f" },
    { id: "state", label: "State", color: "#8c4e2f" },
    { id: "community", label: "Community", color: "#d9b114" },
    { id: "bridge", label: "Bridge", color: "#4a4f57" },
  ] as const;
  const canValueLogCommit = valueLogSummary?.canCommit ?? false;
  const isTopologyContext = semanticLevel === "topology";
  const showTopologyDetails = isTopologyContext && topologyActivated;
  const panelTitle = isTopologyContext
    ? topologyActivated
      ? selected?.label ?? "System"
      : "System"
    : formatSemanticLevel(semanticLevel);
  const sceneContext = formatSemanticContext(semanticLevel);
  const isBuildOptionEnabled = (regionId: RegionId) =>
    !nextTopologyBuildRegion || nextTopologyBuildRegion === regionId;
  const bridgeCoupledValue =
    marketWithDerivatives !== null && values.state.total !== null
      ? marketWithDerivatives + values.state.total
      : null;

  const renderTopologyValues = () => {
    switch (selectedRegionId) {
      case "market":
        return (
          <>
            <div className="iov-panel-value-line">
              <strong>Market total:</strong> {formatIovValue(values.market.total, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Cash equities: {formatIovValue(values.market.cash_equities, values.units)}
            </div>
            {!presentationMode && (
              <div className="iov-panel-value-subline">
                Bonds: {formatIovValue(values.market.bonds, values.units)}
              </div>
            )}
            <div className="iov-panel-value-subline">
              Derivatives notional:{" "}
              {formatIovValue(values.market.derivatives_notional, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Visual market scale (cash + derivatives):{" "}
              {formatIovValue(marketWithDerivatives, values.units)}
            </div>
          </>
        );
      case "state":
        return (
          <>
            <div className="iov-panel-value-line">
              <strong>State total (GDP):</strong> {formatIovValue(values.state.total, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Global GDP: {formatIovValue(values.state.global_gdp, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Compare against market scale:{" "}
              {formatIovValue(marketWithDerivatives, values.units)}
            </div>
          </>
        );
      case "community":
        return (
          <>
            <div className="iov-panel-value-line">
              <strong>Community total:</strong> {formatIovValue(values.community.total, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Nonprofit sector:{" "}
              {formatIovValue(values.community.nonprofit_sector_estimate, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Co-ops / mutuals:{" "}
              {formatIovValue(values.community.coops_mutuals_estimate, values.units)}
            </div>
            {!presentationMode && (
              <div className="iov-panel-value-subline">
                Household unpaid:{" "}
                {formatIovValue(values.community.household_unpaid_estimate, values.units)}
              </div>
            )}
          </>
        );
      case "crony_bridge":
      default:
        return (
          <>
            <div className="iov-panel-value-line">
              <strong>Bridge coupled scale:</strong>{" "}
              {formatIovValue(bridgeCoupledValue, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              Market visual scale: {formatIovValue(marketWithDerivatives, values.units)}
            </div>
            <div className="iov-panel-value-subline">
              State total (GDP): {formatIovValue(values.state.total, values.units)}
            </div>
          </>
        );
    }
  };

  if (isMobile && !mobileExpanded) {
    return (
      <div
        className={`iov-panel iov-panel-peek ${presentationMode ? "is-presentation" : ""} is-mobile iov-level-${semanticLevel}`}
      >
        <button
          type="button"
          className="iov-mobile-panel-open"
          onClick={() => setMobileExpanded(true)}
        >
          Show context ({formatSemanticLevel(semanticLevel)})
        </button>
      </div>
    );
  }

  return (
    <div
      className={`iov-panel iov-level-${semanticLevel} ${
        presentationMode ? "is-presentation" : ""
      } ${isMobile ? "is-mobile" : ""} ${
        isTopologyContext && !topologyActivated ? "is-topology-idle" : ""
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
      {isMobile && isTopologyContext && (
        <div className="iov-mobile-summary">
          <strong>{topologyActivated ? selected?.label ?? "System" : "System"}</strong>
          <span>Community uplift: {transferredCount}</span>
        </div>
      )}
      {showTopologyDetails && <div className="iov-mobile-build-row">
        <button
          type="button"
          onClick={() => onBuild("community")}
          disabled={!isBuildOptionEnabled("community")}
        >
          Community
        </button>
        <button
          type="button"
          onClick={() => onBuild("state")}
          disabled={!isBuildOptionEnabled("state")}
        >
          State
        </button>
        <button
          type="button"
          onClick={() => onBuild("market")}
          disabled={!isBuildOptionEnabled("market")}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => onBuild("crony_bridge")}
          disabled={!isBuildOptionEnabled("crony_bridge")}
        >
          Bridge
        </button>
      </div>}
      {isMobile && semanticLevel === "topology" && showTopologyDetails && (
        <div className="iov-mobile-semantic-row">
          <button type="button" onClick={onOpenBrick} disabled={!canOpenBrick}>
            Open Organization
          </button>
          {canEmpowerCommunity && (
            <button type="button" className="iov-btn-action" onClick={onEmpowerCommunity}>
              {empowerLabel}
            </button>
          )}
          {canReplaySystemImpact && (
            <button type="button" onClick={onReplaySystemImpact}>
              Replay Impact
            </button>
          )}
        </div>
      )}
      {isMobile && semanticLevel === "valuelog" && (
        <>
          <div className="iov-mobile-person-row">
            <button type="button" onClick={onBackSemantic}>
              Back to Person
            </button>
            <button type="button" onClick={onValueLogCommit} disabled={!canValueLogCommit}>
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
      <div className="iov-panel-title">{panelTitle}</div>
      <div className="iov-panel-definition">
        {isTopologyContext
          ? showTopologyDetails
            ? selected?.notes
            : "System map: choose a region in-scene to begin."
          : sceneContext}
      </div>
      {isTopologyContext && !showTopologyDetails && (
        <>
          <div className="iov-panel-meaning">
            Scene-first mode: click the in-scene labels (Market, Community, State, Bridge) to
            start the story. Detailed context appears after your first interaction.
          </div>
          <div className="iov-panel-transfer-count">Community uplift: {transferredCount}</div>
        </>
      )}
      {showTopologyDetails && (
        <>
          <div className="iov-panel-meaning">{meaningText}</div>
          <div className="iov-panel-transfer-tip">
            Tip: click once to select a brick, double-click to open its organization.
          </div>
          <div className="iov-panel-transfer-count">Community uplift: {transferredCount}</div>
          {nextTopologyBuildRegion && (
            <div className="iov-panel-value-subline">
              Guided build next: <strong>{formatRegionShortLabel(nextTopologyBuildRegion)}</strong>
            </div>
          )}

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
          <div className="iov-panel-values">{renderTopologyValues()}</div>

          <details className="iov-panel-advanced">
            <summary>Advanced controls</summary>
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
              <button
                type="button"
                onClick={() => onBuild("community")}
                disabled={!isBuildOptionEnabled("community")}
              >
                Community
              </button>
              <button
                type="button"
                onClick={() => onBuild("state")}
                disabled={!isBuildOptionEnabled("state")}
              >
                State
              </button>
              <button
                type="button"
                onClick={() => onBuild("market")}
                disabled={!isBuildOptionEnabled("market")}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => onBuild("crony_bridge")}
                disabled={!isBuildOptionEnabled("crony_bridge")}
              >
                Bridge
              </button>
            </div>
          </details>
        </>
      )}

      <div className="iov-panel-section-label">
        {isTopologyContext
          ? showTopologyDetails
            ? "System Controls"
            : "Scene Context"
          : "Scene Context"}
      </div>
      <div className="iov-panel-value-subline">
        Level: <strong>{formatSemanticLevel(semanticLevel)}</strong>
      </div>
      {semanticLevel === "topology" ? (
        <>
          {showTopologyDetails ? (
            <>
              <div className="iov-panel-value-subline">
                Selected organization unit: {selectedBrickLabel ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Interaction: double-click selected brick to open organization.
              </div>
              <div className="iov-panel-buttons">
                <button type="button" onClick={onOpenBrick} disabled={!canOpenBrick}>
                  Open Organization
                </button>
                {canEmpowerCommunity && (
                  <button type="button" className="iov-btn-action" onClick={onEmpowerCommunity}>
                    {empowerLabel}
                  </button>
                )}
                {canReplaySystemImpact && (
                  <button type="button" onClick={onReplaySystemImpact}>
                    Replay Impact
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="iov-panel-value-subline">
              Use in-scene labels as the primary controls. Context expands after the first build.
            </div>
          )}
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
                Scene-first mode: tap an orbit/facet to focus meaning. Tap empty space, re-tap the same target, or double-click to reveal the next layer. Double-click the person core to open Time Slice.
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
                    disabled={!personSummary.identityBuildComplete}
                    type="button"
                    >
                        {personSummary.identityBuildComplete
                          ? "Create Value Log (Action)"
                          : "Complete Layers to Unlock Value Log"}
                    </button>
              </div>
              {!personSummary.identityBuildComplete && (
                <div className="iov-panel-value-subline">
                  Finish identity layer reveals, then open Time Slice.
                </div>
              )}
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
                Layer selected: {personSummary.selectedLayer ?? "None"}
              </div>
              <div className="iov-panel-value-subline">
                Facet selected: {personSummary.selectedFacet ?? "None"}
              </div>
              {personSummary.selectedContextTitle && personSummary.selectedContextBody && (
                <>
                  <div className="iov-panel-value-line">
                    <strong>Context: {personSummary.selectedContextTitle}</strong>
                  </div>
                  <div className="iov-panel-value-subline">
                    {personSummary.selectedContextBody}
                  </div>
                </>
              )}
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
                Current action: {valueLogSummary.sceneActionHint}
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
                    <label className="iov-field-label">
                      Activity template
                      <select
                        className="iov-field-input"
                        value={valueLogDraft.activityTemplateId}
                        onChange={(event) => {
                          const template = VALUE_CAPTURE_ACTIVITY_TEMPLATES.find(
                            (entry) => entry.id === event.target.value
                          );
                          if (!template) return;
                          onValueLogDraftChange({
                            activityTemplateId: template.id,
                            activityLabel: template.activityLabel,
                            taskType: template.taskType,
                            intent: template.intent,
                          });
                        }}
                      >
                        {VALUE_CAPTURE_ACTIVITY_TEMPLATES.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="iov-field-label">
                      Proof template
                      <select
                        className="iov-field-input"
                        value={valueLogDraft.proofTemplateId}
                        onChange={(event) => {
                          const template = VALUE_CAPTURE_PROOF_TEMPLATES.find(
                            (entry) => entry.id === event.target.value
                          );
                          if (!template) return;
                          onValueLogDraftChange({
                            proofTemplateId: template.id,
                            proofOfActivity: template.proofOfActivity,
                            artifactType: template.artifactType,
                            evidenceLink: template.evidenceLink,
                          });
                        }}
                      >
                        {VALUE_CAPTURE_PROOF_TEMPLATES.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="iov-field-label">
                      Activity
                      <input
                        className="iov-field-input"
                        value={valueLogDraft.activityLabel}
                        onChange={(event) =>
                          onValueLogDraftChange({ activityLabel: event.target.value })
                        }
                      />
                    </label>
                    <label className="iov-field-label">
                      Proof of activity
                      <input
                        className="iov-field-input"
                        value={valueLogDraft.proofOfActivity}
                        onChange={(event) =>
                          onValueLogDraftChange({ proofOfActivity: event.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
                {valueLogStep === "select_wellbeing" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">2) ~WellbeingProtocol / ~~Context</div>
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
                  </div>
                )}
                {valueLogStep === "select_intensity" && (
                  <div className="iov-panel-log-card">
                    <div className="iov-panel-log-card-title">3) Intensity prompt</div>
                    <div className="iov-panel-value-subline">
                      {WELLBEING_INTENSITY_PROMPTS[valueLogDraft.wellbeingNode]}
                    </div>
                    <label className="iov-field-label">
                      Intensity ({valueLogDraft.contextIntensity.toFixed(2)})
                      <input
                        className="iov-field-range"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={valueLogDraft.contextIntensity}
                        onChange={(event) =>
                          onValueLogDraftChange({ contextIntensity: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="iov-field-label">
                      Context label
                      <input
                        className="iov-field-input"
                        value={valueLogDraft.signalLabel}
                        onChange={(event) =>
                          onValueLogDraftChange({ signalLabel: event.target.value })
                        }
                      />
                    </label>
                    {valueLogDraft.wellbeingNode !== "~~Performance" && (
                      <label className="iov-field-label">
                        Impact direction
                        <select
                          className="iov-field-input"
                          value={valueLogDraft.impactDirection}
                          onChange={(event) =>
                            onValueLogDraftChange({
                              impactDirection: event.target.value as ValueLogDraft["impactDirection"],
                            })
                          }
                        >
                          <option value="increase">Increase</option>
                          <option value="neutral">Neutral</option>
                          <option value="decrease">Decrease</option>
                        </select>
                      </label>
                    )}
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
                        {valueLogDraft.learningTag && (
                          <label className="iov-field-label">
                            {SAOCOMMONS_DOMAIN_PROMPTS["~~Learning"]} ({valueLogDraft.learningIntensity.toFixed(2)})
                            <input
                              className="iov-field-range"
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={valueLogDraft.learningIntensity}
                              onChange={(event) =>
                                onValueLogDraftChange({ learningIntensity: Number(event.target.value) })
                              }
                            />
                          </label>
                        )}
                        {valueLogDraft.earningTag && (
                          <label className="iov-field-label">
                            {SAOCOMMONS_DOMAIN_PROMPTS["~~Earning"]} ({valueLogDraft.earningIntensity.toFixed(2)})
                            <input
                              className="iov-field-range"
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={valueLogDraft.earningIntensity}
                              onChange={(event) =>
                                onValueLogDraftChange({ earningIntensity: Number(event.target.value) })
                              }
                            />
                          </label>
                        )}
                        {valueLogDraft.orgBuildingTag && (
                          <label className="iov-field-label">
                            {SAOCOMMONS_DOMAIN_PROMPTS["~~OrgBuilding"]} ({valueLogDraft.orgBuildingIntensity.toFixed(2)})
                            <input
                              className="iov-field-range"
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={valueLogDraft.orgBuildingIntensity}
                              onChange={(event) =>
                                onValueLogDraftChange({ orgBuildingIntensity: Number(event.target.value) })
                              }
                            />
                          </label>
                        )}
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
                      5) Outcome
                    </div>
                    <div className="iov-panel-value-subline">
                      SAOcommons: {valueLogSummary.outcome.saocommonsEnabled ? "Activated" : "Not activated"}
                    </div>
                    <div className="iov-panel-value-subline">
                      Domains: {valueLogSummary.outcome.saocommonsDomains.map((d) => d.replace("~~", "")).join(", ") || "None"}
                    </div>
                    <div className="iov-panel-value-subline">
                      Signal intensity: {(valueLogSummary.draft.signalScore ?? valueLogDraft.signalScore).toFixed(2)}
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
                Signal: {valueLogDraft.signalLabel} (
                {(valueLogSummary?.draft.signalScore ?? valueLogDraft.signalScore).toFixed(2)})
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

      {showTopologyDetails && (
        <div className="iov-panel-shortcuts">Shortcuts: 1 Community, 2 State, 3 Market, 4 Bridge</div>
      )}
      </div>
    </div>
  );
};

const formatSigned = (value: number) => {
  const rounded = value.toFixed(3);
  return value > 0 ? `+${rounded}` : rounded;
};

const formatRegionShortLabel = (regionId: RegionId) => {
  switch (regionId) {
    case "community":
      return "Community";
    case "state":
      return "State";
    case "market":
      return "Market";
    case "crony_bridge":
      return "Bridge";
    default:
      return regionId;
  }
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
    case "systemimpact":
      return "System Impact";
    default:
      return level;
  }
};

const formatSemanticContext = (level: SemanticZoomLevel) => {
  switch (level) {
    case "block":
      return "Organization interior: select a person and inspect how individual wellbeing signals influence team activation.";
    case "person":
      return "Person layer: reveal identity layers and observe wellbeing/aura state before composing a time slice.";
    case "valuelog":
      return "Time Slice composer: convert effort into a structured causal signal linked to wellbeing impact.";
    case "impact":
      return "Impact transition: the committed signal propagates from person action into visible energetic change.";
    case "orgimpact":
      return "Org contagion: one person's uplift spreads across the organization and increases collective radiance.";
    case "systemimpact":
      return "System impact: organization radiance strengthens community pressure against extractive bridge structures.";
    case "topology":
      return "System layer: compare Market, State, Community, and Bridge structures, then open organizations by double-clicking a selected brick.";
    default:
      return "Scene context is active.";
  }
};

export default IovTopologyPanel;
