import type {
  IovTopologyData,
  RegionId,
  ToggleId,
} from "@/game/iov/IovTopologyScene";
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
  onToggle: (toggleId: ToggleId) => void;
  onBuild: (regionId: RegionId) => void;
  onTogglePresentationMode: () => void;
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
  onToggle,
  onBuild,
  onTogglePresentationMode,
}: IovTopologyPanelProps) => {
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
    <div className={`iov-panel ${presentationMode ? "is-presentation" : ""}`}>
      <div className="iov-panel-header">
        <div className="iov-panel-kicker">IoV Topology</div>
        <button
          type="button"
          className="iov-presentation-toggle"
          onClick={onTogglePresentationMode}
        >
          {presentationMode ? "Exit Presentation" : "Presentation Mode"}
        </button>
      </div>
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

      <div className="iov-panel-shortcuts">Shortcuts: 1 Market, 2 State, 3 Community, 4 Bridge</div>
    </div>
  );
};

export default IovTopologyPanel;
