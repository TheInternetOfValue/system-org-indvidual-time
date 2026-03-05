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
  WELLBEING_INTENSITY_PROMPTS,
  type ValueLogDraft,
  type ValueLogSummary,
  type WizardStep,
} from "@/game/iov/ValueLogModel";
import type { SemanticZoomLevel } from "@/game/iov/IovSemanticZoomController";
import { IOV_IDENTITY_COLORS } from "@/game/iov/iovNarrativeConfig";
import {
  type IovValues,
  formatIovValue,
} from "@/game/iov/iovValues";

type ValueLogActionStage =
  | "time_capture"
  | "activity_capture"
  | "proof_capture"
  | "wellbeing_select"
  | "intensity_select"
  | "performance_domains"
  | "performance_intensity"
  | "ready_capture";

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
  valueLogActionStage: ValueLogActionStage;
  canContinueTimeSliceFlow: boolean;
  onToggle: (toggleId: ToggleId) => void;
  onBuild: (regionId: RegionId) => void;
  onOpenBrick: () => void;
  onOpenPerson: () => void;
  onBackSemantic: () => void;
  onTogglePresentationMode: () => void;
  onValueLogDraftChange: (patch: Partial<ValueLogDraft>) => void;
  onValueLogCommit: () => void;
  onAdvanceValueLogActionStage: () => void;
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
  valueLogActionStage,
  canContinueTimeSliceFlow,
  onToggle,
  onBuild,
  onOpenBrick,
  onOpenPerson,
  onBackSemantic,
  onTogglePresentationMode,
  onValueLogDraftChange,
  onValueLogCommit,
  onAdvanceValueLogActionStage,
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

  useEffect(() => {
    if (isMobile && semanticLevel === "valuelog" && valueLogActionStage === "time_capture") {
      setMobileExpanded(false);
    }
  }, [isMobile, semanticLevel, valueLogActionStage]);

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
    { id: "market", label: "Market", color: IOV_IDENTITY_COLORS.market },
    { id: "state", label: "State", color: IOV_IDENTITY_COLORS.state },
    { id: "community", label: "Community", color: IOV_IDENTITY_COLORS.community },
    { id: "bridge", label: "Bridge", color: IOV_IDENTITY_COLORS.bridge },
  ] as const;
  const isTopologyContext = semanticLevel === "topology";
  const showTopologyDetails = isTopologyContext && topologyActivated;
  const panelTitle = isTopologyContext
    ? topologyActivated
      ? selected?.label ?? "System"
      : "System"
    : formatSemanticLevel(semanticLevel);
  const headerKicker = isTopologyContext
    ? "What is the System and its Value?"
    : "Story Loop Progress";
  const sceneContext = formatSemanticContext(semanticLevel);
  const sceneStoryLink = formatSceneStoryLink(semanticLevel);
  const isBuildOptionEnabled = (regionId: RegionId) =>
    !nextTopologyBuildRegion || nextTopologyBuildRegion === regionId;
  const bridgeCoupledValue =
    marketWithDerivatives !== null && values.state.total !== null
      ? marketWithDerivatives + values.state.total
      : null;
  const presenterCue = getPresenterCue({
    semanticLevel,
    phaseHeadline,
    topologyActivated,
    nextTopologyBuildRegion,
    valueLogSummary,
    valueLogActionStage,
    personSummary,
    canOpenBrick,
    canEmpowerCommunity,
    canReplaySystemImpact,
  });
  const presenterAction = getPresenterAction({
    semanticLevel,
    canOpenBrick,
    canEmpowerCommunity,
    canReplaySystemImpact,
    blockSummary,
    personSummary,
    valueLogSummary,
    valueLogActionStage,
    canContinueTimeSliceFlow,
    onOpenBrick,
    onEmpowerCommunity,
    onReplaySystemImpact,
    onOpenPerson,
    onOpenValueLog,
    onAdvanceValueLogActionStage,
    onValueLogCommit,
    empowerLabel,
  });
  const valueLogPrimaryAction = getValueLogPrimaryAction({
    valueLogActionStage,
    valueLogSummary,
    canContinueTimeSliceFlow,
  });
  const suppressMobilePeekForTimeCapture =
    isMobile && semanticLevel === "valuelog" && valueLogActionStage === "time_capture";

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

  if (suppressMobilePeekForTimeCapture && !mobileExpanded) {
    return null;
  }

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
          {presentationMode
            ? `Show cue (${formatSemanticLevel(semanticLevel)})`
            : `Show context (${formatSemanticLevel(semanticLevel)})`}
        </button>
      </div>
    );
  }

  if (presentationMode) {
    return (
      <div
        className={`iov-panel iov-level-${semanticLevel} is-presentation ${
          isMobile ? "is-mobile" : ""
        }`}
      >
        <div className="iov-panel-header">
          <div className="iov-panel-kicker">Presentation Mode</div>
          <div className="iov-panel-header-actions">
            <button
              type="button"
              className="iov-presentation-toggle"
              onClick={onTogglePresentationMode}
            >
              Exit Presentation
            </button>
            {isMobile && !suppressMobilePeekForTimeCapture && (
              <button
                type="button"
                className="iov-mobile-expand"
                onClick={() => setMobileExpanded((prev) => !prev)}
              >
                {mobileExpanded ? "Hide cue" : "Show cue"}
              </button>
            )}
          </div>
        </div>
        <div className="iov-panel-content iov-panel-content-presenter">
          <div className="iov-phase-headline">{phaseHeadline}</div>
          <div className="iov-panel-title">{panelTitle}</div>
          <div className="iov-panel-value-subline">{sceneStoryLink}</div>
          <div className="iov-panel-presenter-cue">{presenterCue}</div>
          {presenterAction && (
            <button
              type="button"
              className="iov-btn-action"
              onClick={presenterAction.onClick}
              disabled={presenterAction.disabled}
            >
              {presenterAction.label}
            </button>
          )}
          <div className="iov-panel-value-subline">
            Scene is primary. Use breadcrumb chips at top-right for navigation.
          </div>
        </div>
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
        <div className="iov-panel-kicker">{headerKicker}</div>
        <div className="iov-panel-header-actions">
          <button
            type="button"
            className="iov-presentation-toggle"
            onClick={onTogglePresentationMode}
          >
            {presentationMode ? "Exit Presentation" : "Presentation Mode"}
          </button>
          {isMobile && !suppressMobilePeekForTimeCapture && (
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
          {presenterAction ? (
            <button
              type="button"
              className="iov-btn-action"
              onClick={presenterAction.onClick}
              disabled={presenterAction.disabled}
            >
              {presenterAction.label}
            </button>
          ) : (
            <span className="iov-panel-value-subline">Use the in-scene region controls.</span>
          )}
        </div>
      )}
      {isMobile && semanticLevel === "valuelog" && (
        <>
          <div className="iov-mobile-person-row">
            <button type="button" onClick={onBackSemantic}>
              Back to Person
            </button>
            {valueLogPrimaryAction && (
              <button
                type="button"
                onClick={
                  valueLogActionStage === "ready_capture"
                    ? onValueLogCommit
                    : onAdvanceValueLogActionStage
                }
                disabled={valueLogPrimaryAction.disabled}
              >
                {valueLogPrimaryAction.label}
              </button>
            )}
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
      <div className="iov-panel-value-subline">{sceneStoryLink}</div>
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
              {presenterAction ? (
                <div className="iov-panel-buttons">
                  <button
                    type="button"
                    className="iov-btn-action"
                    onClick={presenterAction.onClick}
                    disabled={presenterAction.disabled}
                  >
                    {presenterAction.label}
                  </button>
                </div>
              ) : (
                <div className="iov-panel-value-subline">
                  Primary next step appears here when a scene action is ready.
                </div>
              )}
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
                Scene-first mode: tap an orbit/facet to focus meaning. Re-tap or tap empty space to advance one layer at a time. When layers are complete, open Time Slice.
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
              {valueLogActionStage === "time_capture" && (
                <div className="iov-panel-value-subline">
                  Use the in-scene Start/End calipers on the day stream. Step 1 sets Start from NOW; Step 2 sets End between Start and NOW.
                </div>
              )}
              {valueLogActionStage === "activity_capture" && (
                <div className="iov-panel-value-subline">
                  Set one activity for this time interval in the in-scene dock, then continue.
                </div>
              )}
              {valueLogActionStage === "proof_capture" && (
                <div className="iov-panel-value-subline">
                  Attach one proof artifact for this activity in the in-scene dock, then continue.
                </div>
              )}
              {(valueLogActionStage === "wellbeing_select" ||
                valueLogActionStage === "intensity_select" ||
                valueLogActionStage === "performance_domains" ||
                valueLogActionStage === "performance_intensity" ||
                valueLogActionStage === "ready_capture") && (
                <div className="iov-panel-log-chain">
                  {valueLogActionStage === "wellbeing_select" && (
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">5) Wellbeing Context</div>
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
                  {valueLogActionStage === "intensity_select" && (
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">6) Context Intensity</div>
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
                  {(valueLogActionStage === "performance_domains" ||
                    valueLogActionStage === "performance_intensity") && (
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">7) SAOcommons Domain (Performance)</div>
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
                          Performance domains are only available when node is set to Performance.
                        </div>
                      )}
                    </div>
                  )}
                  {valueLogActionStage === "ready_capture" && (
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">8) Outcome Preview</div>
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
                    </div>
                  )}
                </div>
              )}
              {(valueLogActionStage === "wellbeing_select" ||
                valueLogActionStage === "intensity_select" ||
                valueLogActionStage === "performance_domains" ||
                valueLogActionStage === "performance_intensity" ||
                valueLogActionStage === "ready_capture") && (
                <>
                  <div className="iov-panel-value-subline">
                    Active node: {valueLogDraft.wellbeingNode.replace("~~", "")}
                  </div>
                  <div className="iov-panel-value-subline">
                    Signal: {valueLogDraft.signalLabel} (
                    {(valueLogSummary?.draft.signalScore ?? valueLogDraft.signalScore).toFixed(2)})
                  </div>
                </>
              )}
              {valueLogPrimaryAction && (
                <div className="iov-panel-buttons" style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    className="iov-btn-action"
                    onClick={
                      valueLogActionStage === "ready_capture"
                        ? onValueLogCommit
                        : onAdvanceValueLogActionStage
                    }
                    disabled={valueLogPrimaryAction.disabled}
                  >
                    {valueLogPrimaryAction.label}
                  </button>
                </div>
              )}
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
      {semanticLevel === "topology" && isMobile && (
        <div className="iov-panel-attribution">
          <span className="iov-panel-attribution-label">Movement:</span>{" "}
          <a href="https://theinternetofvalue.xyz/" target="_blank" rel="noopener noreferrer">
            The Internet of Value
          </a>
          <span className="iov-panel-attribution-sep">|</span>
          <span className="iov-panel-attribution-label">Author:</span>{" "}
          <a href="https://www.linkedin.com/in/mosessampaul/" target="_blank" rel="noopener noreferrer">
            Moses Sam Paul
          </a>
        </div>
      )}
      </div>
    </div>
  );
};

interface PresenterCueInput {
  semanticLevel: SemanticZoomLevel;
  phaseHeadline: string;
  topologyActivated: boolean;
  nextTopologyBuildRegion: RegionId | null;
  valueLogSummary: ValueLogSummary | null;
  valueLogActionStage: ValueLogActionStage;
  personSummary: PersonIdentitySummary | null;
  canOpenBrick: boolean;
  canEmpowerCommunity: boolean;
  canReplaySystemImpact: boolean;
}

interface PresenterAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PresenterActionInput {
  semanticLevel: SemanticZoomLevel;
  canOpenBrick: boolean;
  canEmpowerCommunity: boolean;
  canReplaySystemImpact: boolean;
  blockSummary: BlockPeopleSummary | null;
  personSummary: PersonIdentitySummary | null;
  valueLogSummary: ValueLogSummary | null;
  valueLogActionStage: ValueLogActionStage;
  canContinueTimeSliceFlow: boolean;
  onOpenBrick: () => void;
  onEmpowerCommunity: () => void;
  onReplaySystemImpact: () => void;
  onOpenPerson: () => void;
  onOpenValueLog: () => void;
  onAdvanceValueLogActionStage: () => void;
  onValueLogCommit: () => void;
  empowerLabel: string;
}

const getPresenterCue = ({
  semanticLevel,
  phaseHeadline,
  topologyActivated,
  nextTopologyBuildRegion,
  valueLogSummary,
  valueLogActionStage,
  personSummary,
  canOpenBrick,
  canEmpowerCommunity,
  canReplaySystemImpact,
}: PresenterCueInput) => {
  if (semanticLevel === "topology") {
    if (!topologyActivated) {
      return "Tap Community in-scene to start the story loop.";
    }
    if (canEmpowerCommunity) {
      return "Community uplift is ready. Trigger the empowerment action.";
    }
    if (canOpenBrick) {
      return "Brick selected. Double-click it in-scene to open organization.";
    }
    if (nextTopologyBuildRegion) {
      return `Guided build next: ${formatRegionShortLabel(nextTopologyBuildRegion)}.`;
    }
    if (canReplaySystemImpact) {
      return "System loop is complete. Replay impact if you want another take.";
    }
    return phaseHeadline;
  }

  if (semanticLevel === "block") {
    return blockCueForPresentation();
  }

  if (semanticLevel === "person") {
    if (!personSummary) return "Select a person in-scene.";
    if (!personSummary.identityBuildMode) {
      return "Reveal identity layers to start the person-level narrative.";
    }
    if (!personSummary.identityBuildComplete) {
      return "Advance one layer at a time. Keep scene focus on the dropping facets.";
    }
    return "Identity build complete. Open Time Slice from the scene or button below.";
  }

  if (semanticLevel === "valuelog") {
    if (valueLogActionStage === "time_capture") {
      return "Lock start, then lock end on the stream. Keep the interval within today.";
    }
    if (valueLogActionStage === "activity_capture") {
      return "Set one activity label for the selected interval.";
    }
    if (valueLogActionStage === "proof_capture") {
      return "Attach one proof artifact for the activity.";
    }
    if (valueLogActionStage === "ready_capture") {
      return "Time slice is fully composed. Capture value to launch impact.";
    }
    return valueLogSummary?.sceneActionHint ?? "Compose a Time Slice in-scene.";
  }

  if (semanticLevel === "impact") {
    return "Photon drop is propagating into identity impact.";
  }

  if (semanticLevel === "orgimpact") {
    return "Org contagion is spreading. Let the scene finish before next step.";
  }

  if (semanticLevel === "systemimpact") {
    return "System impact sequence is active. Watch the bridge stress response.";
  }

  return phaseHeadline;
};

const blockCueForPresentation = () =>
  "Select one person in-scene, then double-click to open person view.";

const getPresenterAction = ({
  semanticLevel,
  canOpenBrick,
  canEmpowerCommunity,
  canReplaySystemImpact,
  blockSummary,
  personSummary,
  valueLogSummary,
  valueLogActionStage,
  canContinueTimeSliceFlow,
  onOpenBrick,
  onEmpowerCommunity,
  onReplaySystemImpact,
  onOpenPerson,
  onOpenValueLog,
  onAdvanceValueLogActionStage,
  onValueLogCommit,
  empowerLabel,
}: PresenterActionInput): PresenterAction | null => {
  if (semanticLevel === "topology") {
    if (canEmpowerCommunity) {
      return { label: empowerLabel, onClick: onEmpowerCommunity };
    }
    if (canOpenBrick) {
      return { label: "Open Organization", onClick: onOpenBrick };
    }
    if (canReplaySystemImpact) {
      return { label: "Replay Impact", onClick: onReplaySystemImpact };
    }
    return null;
  }

  if (semanticLevel === "block") {
    if (blockSummary?.selectedPersonId) {
      return { label: "Open Person", onClick: onOpenPerson };
    }
    return null;
  }

  if (semanticLevel === "person") {
    if (!personSummary?.identityBuildComplete) {
      return null;
    }
    return { label: "Open Time Slice", onClick: onOpenValueLog };
  }

  if (semanticLevel === "valuelog") {
    if (valueLogActionStage === "time_capture") {
      return null;
    }
    if (valueLogActionStage !== "ready_capture") {
      return {
        label: getValueLogPrimaryActionLabel(valueLogActionStage, valueLogSummary),
        onClick: onAdvanceValueLogActionStage,
        disabled: !canContinueTimeSliceFlow,
      };
    }
    return {
      label: "Capture Value",
      onClick: onValueLogCommit,
      disabled: !(valueLogSummary?.canCommit ?? false),
    };
  }

  return null;
};

const formatSceneStoryLink = (level: SemanticZoomLevel) => {
  if (level === "topology") {
    return "From none | Now: System map | Next: Open organization";
  }
  if (level === "block") {
    return "From System map | Now: Organization interior | Next: Open person";
  }
  if (level === "person") {
    return "From Organization interior | Now: Identity stack | Next: Open time slice";
  }
  if (level === "valuelog") {
    return "From Identity stack | Now: Time slice capture | Next: Commit impact";
  }
  if (level === "impact") {
    return "From Time slice capture | Now: Person impact ripple | Next: Org contagion";
  }
  if (level === "orgimpact") {
    return "From Person impact ripple | Now: Organization activation | Next: System shift";
  }
  if (level === "systemimpact") {
    return "From Organization activation | Now: System realignment | Next: Return to system map";
  }
  return "Story link unavailable.";
};

const getValueLogPrimaryActionLabel = (
  stage: ValueLogActionStage,
  summary: ValueLogSummary | null
) => {
  if (stage === "time_capture") {
    return summary?.timeCapturePhase === "start" ? "Lock Start Slice" : "Lock End Slice";
  }
  if (stage === "activity_capture") return "Confirm Activity";
  if (stage === "proof_capture") return "Confirm Proof";
  if (stage === "wellbeing_select") return "Confirm Context";
  if (stage === "intensity_select") return "Confirm Intensity";
  if (stage === "performance_domains" || stage === "performance_intensity") return "Continue";
  return "Capture Value";
};

const getValueLogPrimaryAction = ({
  valueLogActionStage,
  valueLogSummary,
  canContinueTimeSliceFlow,
}: {
  valueLogActionStage: ValueLogActionStage;
  valueLogSummary: ValueLogSummary | null;
  canContinueTimeSliceFlow: boolean;
}) => {
  if (valueLogActionStage === "time_capture") {
    return null;
  }
  return {
    label: getValueLogPrimaryActionLabel(valueLogActionStage, valueLogSummary),
    disabled:
      valueLogActionStage === "ready_capture"
        ? !(valueLogSummary?.canCommit ?? false)
        : !canContinueTimeSliceFlow,
  };
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
      return "Organization interior: choose one person at a time, then open person view.";
    case "person":
      return "Person layer: reveal identity layers in order, then open a single time-slice capture.";
    case "valuelog":
      return "Time Slice capture: lock start/end, then activity/proof/context, then capture value.";
    case "impact":
      return "Impact transition: committed signal becomes a visible person-level ripple.";
    case "orgimpact":
      return "Org contagion: one person's uplift propagates through the selected organization.";
    case "systemimpact":
      return "System impact: organization activation translates into community pressure on bridge structures.";
    case "topology":
      return "System layer: build the macro view, select one organization, then descend into its people.";
    default:
      return "Scene context is active.";
  }
};

export default IovTopologyPanel;
