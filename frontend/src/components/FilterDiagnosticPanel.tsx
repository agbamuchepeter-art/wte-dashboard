/**
 * TEMPORARY DIAGNOSTIC PANEL — remove when time filter is confirmed working.
 * Shows every step of the filter pipeline so issues are immediately visible.
 */
import { useFilterDiagnostic } from "../hooks/useKPIs";
import { useFilters } from "../contexts/FilterContext";
import clsx from "clsx";

const Row = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <div className="flex items-baseline gap-2 min-w-0">
    <span className="shrink-0 text-slate-500 font-mono" style={{ fontSize: 10, width: 160 }}>{label}</span>
    <span className={clsx("font-mono font-semibold truncate", warn ? "text-red-400" : "text-slate-200")} style={{ fontSize: 11 }}>
      {value}
    </span>
  </div>
);

const Divider = () => <div className="border-l border-slate-700 self-stretch mx-1" />;

export function FilterDiagnosticPanel() {
  const { period, plantId } = useFilters();
  const { data: diag, isFetching, error } = useFilterDiagnostic();

  const PERIOD_LABEL: Record<string, string> = { today: "Today", "7d": "Last 7 Days", "30d": "Last 30 Days" };

  const hasAnomalies  = (diag?.validation.anomalies.length ?? 0) > 0;
  const filterWorking = diag?.validation.filter_is_working ?? null;
  const recordsBefore = diag?.filter_result.rows_before_any_filter;
  const recordsAfter  = diag?.filter_result.rows_after_date_filter;
  const countUnchanged = recordsBefore !== undefined && recordsAfter !== undefined && recordsBefore === recordsAfter;

  return (
    <div className={clsx(
      "mx-6 mb-3 rounded-lg border text-xs font-mono overflow-hidden",
      hasAnomalies
        ? "border-red-500/60 bg-red-950/30"
        : filterWorking === true
          ? "border-emerald-600/40 bg-emerald-950/20"
          : "border-amber-500/40 bg-amber-950/20"
    )}>
      {/* Header */}
      <div className={clsx(
        "flex items-center justify-between px-4 py-2 border-b",
        hasAnomalies ? "border-red-500/40 bg-red-900/20" : "border-slate-700/50"
      )}>
        <div className="flex items-center gap-3">
          <span className={clsx(
            "text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded",
            hasAnomalies ? "bg-red-500 text-white" : filterWorking ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
          )}>
            {isFetching ? "CHECKING..." : hasAnomalies ? "FILTER BROKEN" : filterWorking ? "FILTER WORKING" : "DIAGNOSTIC"}
          </span>
          <span className="text-slate-400 uppercase tracking-wider" style={{ fontSize: 9 }}>
            TEMP DEBUG — remove after fix confirmed
          </span>
        </div>
        {isFetching && (
          <span className="text-slate-600 animate-pulse" style={{ fontSize: 9 }}>fetching…</span>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-red-400 text-xs">
          Backend error: {String(error)}
        </div>
      )}

      {diag && (
        <div className="px-4 py-3 space-y-3">

          {/* Anomaly alerts */}
          {diag.validation.anomalies.map((a, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 rounded px-3 py-1.5">
              <span className="text-red-400 font-bold shrink-0">!</span>
              <span className="text-red-300">{a}</span>
            </div>
          ))}

          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Column 1: Dataset info */}
            <div className="space-y-1.5">
              <div className="text-slate-600 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Dataset</div>
              <Row label="earliest_date"     value={diag.dataset.earliest_date} />
              <Row label="latest_date"       value={diag.dataset.latest_date} />
              <Row label="total_rows"        value={String(diag.dataset.total_rows)} />
              <Row label="date_column_dtype" value={diag.dataset.date_column_dtype}
                   warn={diag.dataset.date_column_dtype === "object"} />
              <Row label="sample_dates[0]"   value={diag.dataset.date_column_sample[0] ?? "—"} />
            </div>

            {/* Column 2: Request + resolved range */}
            <div className="space-y-1.5">
              <div className="text-slate-600 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Request → Resolved</div>
              <Row label="machine_today"    value={diag.machine.today} />
              <Row label="anchor_date"      value={diag.machine.anchor_date} />
              <Row label="period_received"  value={diag.request.period ?? "(none — no period sent)"} warn={!diag.request.period} />
              <Row label="period_label"     value={diag.request.period_label} />
              <Row label="plant_id"         value={diag.request.plant_id} />
              <Row label="start_date"       value={diag.resolved.start_date} />
              <Row label="end_date"         value={diag.resolved.end_date} />
              <Row label="expected_days"    value={String(diag.resolved.expected_days)} />
            </div>

            {/* Column 3: Filter result */}
            <div className="space-y-1.5">
              <div className="text-slate-600 uppercase tracking-widest mb-2" style={{ fontSize: 9 }}>Filter Result</div>
              <Row label="rows_before_filter" value={String(diag.filter_result.rows_before_any_filter)} />
              <Row label="rows_after_plant"   value={String(diag.filter_result.rows_after_plant_filter)} />
              <Row
                label="rows_after_date"
                value={String(diag.filter_result.rows_after_date_filter)}
                warn={countUnchanged || diag.filter_result.rows_after_date_filter === 0}
              />
              <Row label="unique_dates"       value={String(diag.filter_result.unique_dates_in_window)} />
              <Row
                label="filter_applied"
                value={diag.filter_result.date_filter_applied ? "YES" : "NO — same as unfiltered"}
                warn={!diag.filter_result.date_filter_applied}
              />
              <Row
                label="filter_working"
                value={diag.validation.filter_is_working ? "YES" : "NO"}
                warn={!diag.validation.filter_is_working}
              />
              {diag.filter_result.sample_dates_in_window.length > 0 && (
                <Row label="sample_dates"
                     value={diag.filter_result.sample_dates_in_window.slice(0, 3).join(", ")} />
              )}
            </div>
          </div>

          {/* Count-unchanged warning banner */}
          {countUnchanged && (
            <div className="bg-red-900/40 border border-red-500/50 rounded px-3 py-2 text-red-300">
              Record count is the same before and after date filter ({recordsBefore} rows).
              The date filter is not reducing the dataset — check that <code className="bg-red-900 px-1 rounded">period</code> is
              being sent in the API request and that the backend is applying it.
            </div>
          )}

          {/* Frontend request trace */}
          <div className="border-t border-slate-700/50 pt-2 mt-1 text-slate-600" style={{ fontSize: 9 }}>
            <span className="uppercase tracking-wider">Frontend sending: </span>
            <span className="text-slate-400 font-mono">
              period=<strong className={clsx(!period && "text-red-400")}>{period || "(undefined)"}</strong>
              &nbsp;&nbsp;plant_id=<strong>{plantId}</strong>
              &nbsp;&nbsp;→ query key: ["filter-diagnostic", "{plantId}", "{period}"]
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
