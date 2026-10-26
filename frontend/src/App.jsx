
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  Download,
  Factory,
  Gauge,
  Leaf,
  LoaderCircle,
  RefreshCw,
  Search,
  Wind,
  Zap,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { label: "Overview", icon: Gauge },
  { label: "Forecast accuracy", icon: Activity },
  { label: "Generation data", icon: Factory },
];

const formatNumber = (value, digits = 0) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "N/A";
  }

  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

const formatMW = (value, digits = 0) =>
  value === null || value === undefined
    ? "N/A"
    : `${formatNumber(value, digits)} MW`;

const formatDate = (value, options = {}) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    ...options,
    timeZone: "Europe/London",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(date);
};

const toCSV = (records) => {
  const headers = [
    "Delivery time",
    "Forecast publication time",
    "Forecast MW",
    "Actual MW",
    "Error MW",
    "Absolute error MW",
  ];

  const rows = records.map((record) => [
    record.startTime,
    record.publishTime,
    record.forecastMW,
    record.actualMW,
    record.errorMW,
    record.absoluteErrorMW,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
};

function MetricCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  accent = "blue",
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
              {value}
            </span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
        </div>
        <div className={`rounded-xl p-3 ${accents[accent] || accents.blue}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/accuracy/`);

      if (!response.ok) {
        let details = "";
        try {
          const body = await response.json();
          details = body.details || body.error || "";
        } catch {
          // The server may return a non-JSON error page.
        }

        throw new Error(
          details || `The API returned HTTP ${response.status}.`
        );
      }

      const result = await response.json();

      if (!result.metrics || !Array.isArray(result.records)) {
        throw new Error("The API response is missing forecast records or metrics.");
      }

      setData(result);
    } catch (err) {
      setError(
        `${err.message} Make sure the Django backend is running at ${API_BASE}.`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const records = data?.records || [];
  const metrics = data?.metrics || {};

  const availableDays = useMemo(() => {
    const days = new Set();

    records.forEach((record) => {
      if (record.startTime) {
        days.add(
          new Date(record.startTime).toLocaleDateString("en-CA", {
            timeZone: "Europe/London",
          })
        );
      }
    });

    return [...days].sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const day = record.startTime
        ? new Date(record.startTime).toLocaleDateString("en-CA", {
            timeZone: "Europe/London",
          })
        : "";

      const matchesDay = selectedDay === "all" || day === selectedDay;

      const matchesSearch =
        !query ||
        String(record.startTime || "").toLowerCase().includes(query) ||
        String(record.publishTime || "").toLowerCase().includes(query) ||
        String(record.forecastMW ?? "").includes(query) ||
        String(record.actualMW ?? "").includes(query);

      return matchesDay && matchesSearch;
    });
  }, [records, search, selectedDay]);

  const chartData = useMemo(() => {
    const daily = new Map();

    records.forEach((record) => {
      if (!record.startTime) return;

      const day = new Date(record.startTime).toLocaleDateString("en-CA", {
        timeZone: "Europe/London",
      });

      if (!daily.has(day)) {
        daily.set(day, {
          day,
          forecastTotal: 0,
          actualTotal: 0,
          count: 0,
        });
      }

      const item = daily.get(day);
      item.forecastTotal += Number(record.forecastMW) || 0;
      item.actualTotal += Number(record.actualMW) || 0;
      item.count += 1;
    });

    return [...daily.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((item) => ({
        date: item.day,
        label: formatDate(`${item.day}T12:00:00Z`, {
          day: "2-digit",
          month: "short",
        }),
        forecast: item.count ? item.forecastTotal / item.count : 0,
        actual: item.count ? item.actualTotal / item.count : 0,
      }));
  }, [records]);

  const averageActual = useMemo(() => {
    if (!records.length) return null;

    return (
      records.reduce((sum, record) => sum + (Number(record.actualMW) || 0), 0) /
      records.length
    );
  }, [records]);

  const averageForecast = useMemo(() => {
    if (!records.length) return null;

    return (
      records.reduce(
        (sum, record) => sum + (Number(record.forecastMW) || 0),
        0
      ) / records.length
    );
  }, [records]);

  const accuracyPercent = useMemo(() => {
    if (averageActual === null || averageActual === 0 || metrics.maeMW == null) {
      return null;
    }

    return Math.max(0, 100 * (1 - Number(metrics.maeMW) / averageActual));
  }, [averageActual, metrics.maeMW]);

  const paginationCount = Math.max(
    1,
    Math.ceil(filteredRecords.length / pageSize)
  );

  const paginatedRecords = filteredRecords.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, selectedDay]);

  function downloadCSV() {
    if (!filteredRecords.length) return;

    const blob = new Blob([toCSV(filteredRecords)], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "windwise-uk-january-2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const navigate = (label) => {
    setActiveNav(label);

    if (label === "Overview") {
      document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" });
    } else if (label === "Forecast accuracy") {
      document.getElementById("accuracy")?.scrollIntoView({ behavior: "smooth" });
    } else {
      document.getElementById("generation-data")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Wind size={24} />
          </div>
          <div>
            <p className="font-heading text-lg font-extrabold tracking-tight text-slate-900">
              WindWise <span className="text-blue-600">UK</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Energy intelligence
            </p>
          </div>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => navigate(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  activeNav === label
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={19} />
                {label}
                {activeNav === label && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <div className="mb-3 flex items-center gap-2">
              <Leaf size={18} className="text-emerald-400" />
              <span className="text-sm font-bold">Clean energy insights</span>
            </div>
            <p className="text-xs leading-5 text-slate-300">
              Understand forecast errors and support better energy purchasing
              decisions.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              January 2026 analysis
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-400">
            WindWise UK · Data analysis dashboard
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Workspace</span>
                <span>/</span>
                <span className="font-semibold text-slate-600">WindWise UK</span>
              </div>
              <h1 className="mt-1 font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Wind generation overview
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex">
                <CalendarDays size={15} className="text-blue-600" />
                January 2026
                <ChevronDown size={14} />
              </div>
              <button
                onClick={() => loadData(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={downloadCSV}
                disabled={!filteredRecords.length}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-8">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Could not load the dashboard data</p>
                <p className="mt-1 break-words leading-6">{error}</p>
                <button
                  onClick={() => loadData()}
                  className="mt-3 rounded-lg bg-red-100 px-3 py-2 font-bold hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-600">
                <LoaderCircle size={34} className="animate-spin" />
              </div>
              <div className="text-center">
                <h2 className="font-heading text-lg font-bold text-slate-900">
                  Loading wind generation data
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Retrieving January 2026 forecast and actual records...
                </p>
              </div>
            </div>
          ) : (
            <>
            
{data?.diagnostics && (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={21} />
      <div>
        <h3 className="font-bold text-amber-900">
          Forecast coverage and methodology
        </h3>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          The current analysis matches{" "}
          {formatNumber(data.diagnostics.matchedPeriods)} of{" "}
          {formatNumber(data.diagnostics.actualPeriods)} actual delivery
          periods ({formatNumber(data.diagnostics.coveragePercent, 1)}%
          coverage). The retrieved WINDFOR records currently have hourly
          target timestamps, while actual generation is half-hourly.
          Accuracy metrics therefore apply only to matched timestamps,
          not the full set of January delivery periods.
        </p>
        <p className="mt-2 text-xs leading-5 text-amber-800">
          Day-ahead cutoff: {data.diagnostics.decisionCutoff}.
          Verify this assumption against the assignment brief before
          presenting the results as final.
        </p>
      </div>
    </div>
  </div>
)}

              <section id="overview" className="scroll-mt-28">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                      Performance snapshot
                    </p>
                    <h2 className="font-heading text-xl font-extrabold text-slate-900">
                      Forecast performance
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Day-ahead wind generation forecasts compared with
                      recorded generation.
                    </p>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={15} />
                    Elexon BMRS data
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    title="Mean absolute error"
                    value={formatNumber(metrics.maeMW)}
                    unit="MW"
                    description="Average size of the forecast error, regardless of direction."
                    icon={Activity}
                    accent="blue"
                  />
                  <MetricCard
                    title="Root mean square error"
                    value={formatNumber(metrics.rmseMW)}
                    unit="MW"
                    description="Places greater weight on larger forecast errors."
                    icon={Zap}
                    accent="purple"
                  />
                  <MetricCard
                    title="Forecast bias"
                    value={formatNumber(metrics.biasMW)}
                    unit="MW"
                    description={
                      Number(metrics.biasMW) > 0
                        ? "Positive bias means forecasts were higher than actual generation on average."
                        : Number(metrics.biasMW) < 0
                        ? "Negative bias means forecasts were lower than actual generation on average."
                        : "Average signed difference between forecast and actual generation."
                    }
                    icon={Number(metrics.biasMW) >= 0 ? ArrowUpRight : ArrowDownRight}
                    accent="orange"
                  />
                  <MetricCard
                    title="Matched periods"
                    value={formatNumber(metrics.matchedPeriods)}
                    description="Delivery periods with both an eligible forecast and an actual value."
                    icon={CheckCircle2}
                    accent="green"
                  />
                  
<MetricCard
  title="Forecast coverage"
  value={`${formatNumber(data?.diagnostics?.coveragePercent ?? 0, 1)}%`}
  description={`${formatNumber(data?.diagnostics?.matchedPeriods ?? metrics.matchedPeriods)} of ${formatNumber(data?.diagnostics?.actualPeriods)} actual periods have a matching eligible forecast.`}
  icon={Activity}
  accent="orange"
/>

                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                  <SectionHeading
                    eyebrow="Generation trends"
                    title="Forecast vs actual generation"
                    description="Daily averages of matched delivery periods, in MW."
                    action={
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          Forecast
                        </span>
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Actual
                        </span>
                      </div>
                    }
                  />

                  <div className="h-[300px] w-full">
                    {chartData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="forecastGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#3b82f6"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="100%"
                                stopColor="#3b82f6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="actualGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#10b981"
                                stopOpacity={0.16}
                              />
                              <stop
                                offset="100%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            stroke="#e9eef5"
                            strokeDasharray="4 4"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={18}
                          />
                          <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={58}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}k`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
                              fontSize: 12,
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                            formatter={(value, name) => [
                              `${formatNumber(value)} MW`,
                              name === "forecast" ? "Forecast" : "Actual",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="forecast"
                            name="forecast"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#forecastGradient)"
                            activeDot={{ r: 4 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="actual"
                            name="actual"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fill="url(#actualGradient)"
                            activeDot={{ r: 4 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No chart data is available.
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    The chart shows daily averages, not individual half-hour
                    readings. Accuracy metrics use the matched records returned
                    by the backend.
                  </p>
                </div>

                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeading
                    eyebrow="Analysis summary"
                    title="At a glance"
                    description="Context for the selected delivery month."
                  />

                  <div className="space-y-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <Wind size={17} className="text-blue-600" />
                        Average forecast generation
                      </div>
                      <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">
                        {formatMW(averageForecast)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <Cloud size={17} className="text-emerald-600" />
                        Average actual generation
                      </div>
                      <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">
                        {formatMW(averageActual)}
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-600">
                          Indicative accuracy score
                        </span>
                        <span className="font-heading text-lg font-extrabold text-slate-900">
                          {accuracyPercent === null
                            ? "N/A"
                            : `${formatNumber(accuracyPercent, 1)}%`}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, accuracyPercent || 0)
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Calculated as 100 × (1 − MAE / average actual). This is
                        an illustrative normalized score, not a standard
                        industry accuracy metric.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                          <Clock3 size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Day-ahead decision
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Forecasts are selected using the publication cutoff
                            configured in the backend. Verify the cutoff against
                            the assignment's purchasing-decision assumption.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="accuracy" className="scroll-mt-28">
                <SectionHeading
                  eyebrow="Forecast accuracy"
                  title="Understand the error"
                  description="How predicted wind generation differs from recorded output."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-500">
                        MAE
                      </span>
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <Activity size={18} />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-extrabold text-slate-900">
                      {formatMW(metrics.maeMW)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Mean absolute error measures the typical absolute
                      difference between forecast and actual generation.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-500">
                        RMSE
                      </span>
                      <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                        <Zap size={18} />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-extrabold text-slate-900">
                      {formatMW(metrics.rmseMW)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Root mean square error penalizes larger misses more
                      heavily than MAE.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-500">
                        Bias
                      </span>
                      <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-extrabold text-slate-900">
                      {formatMW(metrics.biasMW)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Signed mean error. Positive values indicate overforecasting;
                      negative values indicate underforecasting.
                    </p>
                  </div>
                </div>
              </section>

              <section id="generation-data" className="scroll-mt-28">
                <SectionHeading
                  eyebrow="Data explorer"
                  title="Delivery period records"
                  description="Inspect individual forecast and actual values for January 2026."
                  action={
                    <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                      {formatNumber(filteredRecords.length)} records
                    </span>
                  }
                />

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search delivery or values..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    <div className="relative w-full sm:w-auto">
                      <CalendarDays
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={selectedDay}
                        onChange={(event) => setSelectedDay(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-blue-400 sm:min-w-48"
                      >
                        <option value="all">All delivery dates</option>
                        {availableDays.map((day) => (
                          <option key={day} value={day}>
                            {formatDate(`${day}T12:00:00Z`, {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Delivery time (UK)</th>
                          <th className="px-5 py-4">Forecast published</th>
                          <th className="px-5 py-4 text-right">Forecast</th>
                          <th className="px-5 py-4 text-right">Actual</th>
                          <th className="px-5 py-4 text-right">Error</th>
                          <th className="px-5 py-4 text-right">Abs. error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedRecords.map((record, index) => {
                          const errorValue = Number(record.errorMW);

                          return (
                            <tr
                              key={`${record.startTime}-${index}`}
                              className="transition hover:bg-slate-50/80"
                            >
                              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                                {formatDateTime(record.startTime)}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                {formatDateTime(record.publishTime)}
                              </td>
                              <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-700">
                                {formatNumber(record.forecastMW)}
                              </td>
                              <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-700">
                                {formatNumber(record.actualMW)}
                              </td>
                              <td
                                className={`px-5 py-4 text-right font-bold tabular-nums ${
                                  errorValue > 0
                                    ? "text-orange-600"
                                    : errorValue < 0
                                    ? "text-blue-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {errorValue > 0 ? "+" : ""}
                                {formatNumber(record.errorMW)}
                              </td>
                              <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-700">
                                {formatNumber(record.absoluteErrorMW)}
                              </td>
                            </tr>
                          );
                        })}

                        {!paginatedRecords.length && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-5 py-12 text-center text-sm text-slate-400"
                            >
                              No records match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Showing{" "}
                      {filteredRecords.length
                        ? (page - 1) * pageSize + 1
                        : 0}
                      {"–"}
                      {Math.min(page * pageSize, filteredRecords.length)} of{" "}
                      {formatNumber(filteredRecords.length)} matched records
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="px-2 text-xs font-semibold text-slate-500">
                        Page {page} of {paginationCount}
                      </span>
                      <button
                        disabled={page >= paginationCount}
                        onClick={() => setPage((current) => current + 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center">
                <p>WindWise UK · Wind generation forecast analysis</p>
                <p>
                  Source: Elexon BMRS · Delivery period: January 2026
                </p>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
