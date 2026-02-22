import { useEffect, useState } from "react";
import type {
  BrickInteractionMode,
  IovTopologyData,
  RegionId,
  ToggleId,
} from "@/game/iov/IovTopologyScene";
import type { BlockPeopleSummary } from "@/game/iov/BlockInteriorScene";
import type {
  PersonDetailMode,
  PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
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
  interactionMode: BrickInteractionMode;
  personViewMode: PersonDetailMode;
  onToggle: (toggleId: ToggleId) => void;
  onBuild: (regionId: RegionId) => void;
  onOpenBrick: () => void;
  onBackSemantic: () => void;
  onInteractionModeChange: (mode: BrickInteractionMode) => void;
  onTogglePresentationMode: () => void;
  onPersonViewModeChange: (mode: PersonDetailMode) => void;
  onToggleTimelinePlayback: () => void;
  onStepTimeline: () => void;
  onTimelineSpeedChange: (speed: number) => void;
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
  interactionMode,
  personViewMode,
  onToggle,
  onBuild,
  onOpenBrick,
  onBackSemantic,
  onInteractionModeChange,
  onTogglePresentationMode,
  onPersonViewModeChange,
  onToggleTimelinePlayback,
  onStepTimeline,
  onTimelineSpeedChange,
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
            Open Brick
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
      {isMobile && semanticLevel === "person" && (
        <>
          <div className="iov-mobile-person-row">
            <button
              type="button"
              className={personViewMode === "identity" ? "is-active" : ""}
              onClick={() => onPersonViewModeChange("identity")}
            >
              Identity
            </button>
            <button
              type="button"
              className={personViewMode === "daily_logs" ? "is-active" : ""}
              onClick={() => onPersonViewModeChange("daily_logs")}
            >
              Daily Logs
            </button>
            <button type="button" onClick={onToggleTimelinePlayback}>
              {personSummary?.timelinePlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={onStepTimeline}>
              Next Log
            </button>
          </div>
          {personViewMode === "identity" && personSummary && (
            <div className="iov-mobile-layer-rail" aria-label="Identity layers">
              {personSummary.layerLabels.map((layer) => {
                const isActive =
                  layer === personSummary.selectedLayer || layer === personSummary.hoveredLayer;
                return (
                  <span key={layer} className={`iov-mobile-layer-pill ${isActive ? "is-active" : ""}`}>
                    {layer}
                  </span>
                );
              })}
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
        Level: <strong>{semanticLevel}</strong>
      </div>
      {semanticLevel === "topology" && (
        <div className="iov-panel-value-subline">
          Brick mode: <strong>{interactionMode}</strong>
        </div>
      )}
      {semanticLevel === "topology" ? (
        <>
          <div className="iov-panel-value-subline">
            Selected brick: {selectedBrickLabel ?? "None"}
          </div>
          <div className="iov-panel-buttons">
            <button type="button" onClick={onOpenBrick} disabled={!canOpenBrick}>
              Open Brick
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
              <div className="iov-panel-mode-toggle">
                <button
                  type="button"
                  className={personViewMode === "identity" ? "is-active" : ""}
                  onClick={() => onPersonViewModeChange("identity")}
                >
                  Identity
                </button>
                <button
                  type="button"
                  className={personViewMode === "daily_logs" ? "is-active" : ""}
                  onClick={() => onPersonViewModeChange("daily_logs")}
                >
                  Daily Logs
                </button>
              </div>
              {personViewMode === "identity" ? (
                <>
                  <div className="iov-panel-layer-rail">
                    {personSummary.layerLabels.map((layer) => {
                      const isActive =
                        layer === personSummary.selectedLayer ||
                        layer === personSummary.hoveredLayer;
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
                </>
              ) : (
                <>
                  <div className="iov-panel-value-subline">
                    Current log: {personSummary.currentLogCaption}
                  </div>
                  <div className="iov-panel-value-subline">
                    Direct layer impact: {personSummary.directImpactLayers.join(", ")}
                  </div>
                  <div className="iov-panel-value-subline">
                    Derived impact: {personSummary.derivedImpactLayers.join(", ")}
                  </div>
                  <div className="iov-panel-log-chain">
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">~ValueCaptureProtocol</div>
                      <div className="iov-panel-value-subline">
                        Activity:{" "}
                        {personSummary.currentLog?.["~ValueCaptureProtocol"]["~~Activity"][
                          "~~~ActivityLabel"
                        ] ?? "TBD"}
                      </div>
                      <div className="iov-panel-value-subline">
                        Proof:{" "}
                        {personSummary.currentLog?.["~ValueCaptureProtocol"]["~~Proof"][
                          "~~~ProofOfActivity"
                        ] ?? "TBD"}
                      </div>
                    </div>
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">~WellbeingProtocol</div>
                      <div className="iov-panel-value-subline">
                        Learning:{" "}
                        {formatProtocolNumber(
                          personSummary.currentLog?.["~WellbeingProtocol"]["~~Performance"][
                            "~~~LearningOutput"
                          ]
                        )}
                      </div>
                      <div className="iov-panel-value-subline">
                        Earning:{" "}
                        {formatProtocolNumber(
                          personSummary.currentLog?.["~WellbeingProtocol"]["~~Performance"][
                            "~~~EarningOutput"
                          ]
                        )}
                      </div>
                      <div className="iov-panel-value-subline">
                        Org:{" "}
                        {formatProtocolNumber(
                          personSummary.currentLog?.["~WellbeingProtocol"]["~~Performance"][
                            "~~~OrgBuildingOutput"
                          ]
                        )}
                      </div>
                    </div>
                    <div className="iov-panel-log-card">
                      <div className="iov-panel-log-card-title">~SAOcommons</div>
                      <div className="iov-panel-value-subline">
                        Decision:{" "}
                        {personSummary.currentLog?.["~SAOcommons"]["~~Validation"][
                          "~~~ValidationDecision"
                        ] ?? "TBD"}
                      </div>
                      <div className="iov-panel-value-subline">
                        Review:{" "}
                        {personSummary.currentLog?.["~SAOcommons"]["~~Validation"][
                          "~~~EvidenceReview"
                        ] ?? "TBD"}
                      </div>
                    </div>
                  </div>
                  <div className="iov-panel-mode-toggle iov-panel-mode-toggle-compact">
                    <button type="button" onClick={onToggleTimelinePlayback}>
                      {personSummary.timelinePlaying ? "Pause" : "Play"}
                    </button>
                    <button type="button" onClick={onStepTimeline}>
                      Next Log
                    </button>
                    <button
                      type="button"
                      className={personSummary.timelineSpeed === 1 ? "is-active" : ""}
                      onClick={() => onTimelineSpeedChange(1)}
                    >
                      1x
                    </button>
                    <button
                      type="button"
                      className={personSummary.timelineSpeed === 2 ? "is-active" : ""}
                      onClick={() => onTimelineSpeedChange(2)}
                    >
                      2x
                    </button>
                  </div>
                </>
              )}
              <div className="iov-panel-value-subline">
                Wellbeing score: {personSummary.wellbeingScore.toFixed(3)}
              </div>
              <div className="iov-panel-value-subline">
                Aura strength: {personSummary.auraStrength.toFixed(3)}
              </div>
              <div className="iov-panel-value-subline">
                Delta 24h: {personSummary.delta24h.toFixed(3)}
              </div>
              <div className="iov-panel-value-subline">
                Delta 7d(avg): {personSummary.delta7d.toFixed(3)}
              </div>
              <div className="iov-panel-value-subline">
                Timeline logs: {personSummary.processedLogs}/{personSummary.totalLogs}
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

const formatProtocolNumber = (value: number | undefined) =>
  typeof value === "number" ? value.toFixed(3) : "TBD";

export default IovTopologyPanel;
