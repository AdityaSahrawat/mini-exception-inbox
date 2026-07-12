"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Layers, 
  ExternalLink,
  Check,
  Eye,
  Info,
  Database
} from "lucide-react";

// Types matching Backend schemas
interface ExceptionItem {
  id: number;
  date: string;
  plant_id: string;
  product_code: string;
  planned_units: number;
  actual_units: number;
  deficit_pct: number;
  severity: "high" | "medium";
  status: "open" | "acknowledged" | "resolved";
}

interface TrendPoint {
  date: string;
  planned_units: number;
  actual_units: number;
}

interface ExceptionDetail {
  exception: ExceptionItem;
  trend: TrendPoint[];
}

const API_BASE_URL = "http://localhost:8000";

export default function ExceptionInbox() {
  // Exception states
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // Selected Exception & Trend Detail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ExceptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Timeline collapsed states
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    open: 0,
    acknowledged: 0,
    resolved: 0
  });

  // Fetch all exceptions & product list
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch exceptions
      const res = await fetch(`${API_BASE_URL}/exceptions`);
      if (!res.ok) throw new Error("Failed to fetch exceptions");
      const data: ExceptionItem[] = await res.json();
      setExceptions(data);

      // Compute statistics based on fetched exceptions
      const computedStats = data.reduce((acc, curr) => {
        acc.total++;
        if (curr.severity === "high") acc.high++;
        else acc.medium++;
        
        acc[curr.status]++;
        return acc;
      }, { total: 0, high: 0, medium: 0, open: 0, acknowledged: 0, resolved: 0 });
      setStats(computedStats);

      // Fetch products
      const prodRes = await fetch(`${API_BASE_URL}/products`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to the backend database API. Ensure the server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch exception detail (7-day trend) when selectedId changes
  useEffect(() => {
    if (selectedId === null) {
      setDetailData(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/exceptions/${selectedId}`);
        if (!res.ok) throw new Error("Failed to fetch exception detail");
        const data: ExceptionDetail = await res.json();
        setDetailData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedId]);

  // Patch exception status (Acknowledge/Resolve)
  const handleUpdateStatus = async (id: number, newStatus: "acknowledged" | "resolved") => {
    try {
      const res = await fetch(`${API_BASE_URL}/exceptions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update exception status");
      
      const updatedItem: ExceptionItem = await res.json();

      // Optimistically update list state
      setExceptions(prev => prev.map(item => item.id === id ? updatedItem : item));
      
      // Update selected drawer state if matching
      if (detailData && detailData.exception.id === id) {
        setDetailData(prev => prev ? { ...prev, exception: updatedItem } : null);
      }

      // Recalculate stats quickly
      setStats(prev => {
        const oldItem = exceptions.find(x => x.id === id);
        if (!oldItem) return prev;
        
        const nextStats = { ...prev };
        nextStats[oldItem.status]--;
        nextStats[newStatus]++;
        return nextStats;
      });

    } catch (err) {
      console.error(err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Toggle Collapse for a specific day
  const toggleDateCollapse = (dateStr: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Expand all days
  const expandAll = () => {
    setCollapsedDates({});
  };

  // Collapse all days
  const collapseAll = () => {
    const dates = Array.from(new Set(exceptions.map(x => x.date)));
    const collapseMap: Record<string, boolean> = {};
    dates.forEach(d => {
      collapseMap[d] = true;
    });
    setCollapsedDates(collapseMap);
  };

  // Filter Exceptions locally
  const filteredExceptions = exceptions.filter(item => {
    // 1. Product Search (matches exact code or part of it)
    const matchesSearch = searchTerm === "" || 
      item.product_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Severity Filter
    const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;

    // 3. Status Filter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    // 4. Product Dropdown Filter
    const matchesProductDropdown = productFilter === "all" || item.product_code === productFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesProductDropdown;
  });

  // Group exceptions by Date (newest date first)
  const groupedExceptions: Record<string, ExceptionItem[]> = {};
  filteredExceptions.forEach(item => {
    if (!groupedExceptions[item.date]) {
      groupedExceptions[item.date] = [];
    }
    groupedExceptions[item.date].push(item);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedExceptions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#070b15] text-slate-100 flex flex-col font-sans selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* Background glowing decorations */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-rose-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Database className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                DESTILEA exception hub
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] tracking-widest font-mono uppercase">
                Planner UI v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Connection Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3 shadow-lg shadow-rose-950/20">
            <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-rose-300">Backend Connection Error</h4>
              <p className="text-sm opacity-90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Overview Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/30 border border-slate-800/80 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Total exceptions</span>
            <span className="text-3xl font-bold mt-2 text-slate-100">{stats.total}</span>
          </div>
          
          <div className="bg-rose-500/5 border border-rose-500/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase">High Severity</span>
            <span className="text-3xl font-bold mt-2 text-rose-300">{stats.high}</span>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">Medium Severity</span>
            <span className="text-3xl font-bold mt-2 text-amber-300">{stats.medium}</span>
          </div>

          <div className="bg-sky-500/5 border border-sky-500/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-sky-400 uppercase">Open / Action</span>
            <span className="text-3xl font-bold mt-2 text-sky-300">{stats.open}</span>
          </div>

          <div className="bg-violet-500/5 border border-violet-500/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-violet-400 uppercase">Acknowledged</span>
            <span className="text-3xl font-bold mt-2 text-violet-300">{stats.acknowledged}</span>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Resolved</span>
            <span className="text-3xl font-bold mt-2 text-emerald-300">{stats.resolved}</span>
          </div>
        </section>

        {/* Workspace Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Timeline Exception Inbox Section */}
          <div className="flex-1 w-full flex flex-col gap-4">
            
            {/* Filter and Query bar */}
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-xl p-4 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-[#0a0f1d] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  
                  {/* Product Filter */}
                  <div className="flex items-center gap-2 bg-[#0a0f1d] border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-500 font-medium">SKU:</span>
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 focus:outline-none border-none py-1 pr-4 cursor-pointer"
                    >
                      <option value="all">All Products</option>
                      {products.map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity Filter */}
                  <div className="flex items-center gap-2 bg-[#0a0f1d] border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-500 font-medium">Severity:</span>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 focus:outline-none border-none py-1 pr-4 cursor-pointer"
                    >
                      <option value="all">All Severities</option>
                      <option value="high">High Only</option>
                      <option value="medium">Medium Only</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2 bg-[#0a0f1d] border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 focus:outline-none border-none py-1 pr-4 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Quick Actions (Expand/Collapse) */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                <span>Showing {filteredExceptions.length} exceptions</span>
                <div className="flex gap-4">
                  <button onClick={expandAll} className="hover:text-slate-300 transition-colors">Expand All</button>
                  <span className="text-slate-800">|</span>
                  <button onClick={collapseAll} className="hover:text-slate-300 transition-colors">Collapse All</button>
                </div>
              </div>
            </div>

            {/* Ingestion loading state */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 bg-slate-900/10 border border-slate-800/50 rounded-xl backdrop-blur-md">
                <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
                <span className="text-sm text-slate-400">Loading planner inbox data...</span>
              </div>
            ) : filteredExceptions.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 bg-slate-900/10 border border-slate-800/50 rounded-xl backdrop-blur-md">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/80" />
                <h3 className="font-semibold text-slate-200">No Exceptions Found</h3>
                <p className="text-xs text-slate-500">All production matching plan values, or filter criteria returned zero deficits.</p>
              </div>
            ) : (
              
              /* Grouped Timeline list */
              <div className="flex flex-col gap-6">
                {sortedDates.map(dateStr => {
                  const dateExcs = groupedExceptions[dateStr];
                  const isCollapsed = collapsedDates[dateStr] || false;
                  
                  // Beautify date display
                  const formattedDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  });

                  return (
                    <div key={dateStr} className="flex flex-col gap-2">
                      
                      {/* Date Group Header */}
                      <button 
                        onClick={() => toggleDateCollapse(dateStr)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-900/25 border border-slate-800/40 hover:bg-slate-900/40 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                          )}
                          <Calendar className="h-4 w-4 text-violet-400" />
                          <span className="font-semibold text-sm text-slate-200">
                            {formattedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-mono">
                            {dateExcs.length} {dateExcs.length === 1 ? 'exception' : 'exceptions'}
                          </span>
                        </div>
                      </button>

                      {/* Exceptions list for that date */}
                      {!isCollapsed && (
                        <div className="flex flex-col gap-2 pl-2 border-l border-slate-800/60 ml-4 mt-1 transition-all duration-200">
                          {dateExcs.map(item => {
                            const isSelected = selectedId === item.id;
                            
                            // Severity badge style
                            const severityStyle = item.severity === "high" 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20";
                              
                            // Status badge style
                            const statusStyle = item.status === "open"
                              ? "bg-sky-500/15 text-sky-400 border-sky-500/20"
                              : item.status === "acknowledged"
                              ? "bg-violet-500/15 text-violet-400 border-violet-500/20"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";

                            return (
                              <div 
                                key={item.id}
                                className={`group/card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-[#10162a]/90 border-violet-500/60 shadow-lg shadow-violet-950/20 scale-[1.01]' 
                                    : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700/60 hover:bg-slate-900/50'
                                }`}
                              >
                                {/* Left Side Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                                  
                                  {/* Severity indicator block */}
                                  <div className={`h-8 w-1.5 rounded-full shrink-0 ${
                                    item.severity === "high" ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                                  }`} />

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-sm tracking-wide text-slate-100 group-hover/card:text-violet-300 transition-colors">
                                        {item.product_code}
                                      </span>
                                      <span className="text-[10px] text-slate-500 tracking-wider">
                                        ({item.plant_id})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono mt-0.5">
                                      <span>Planned: <strong className="text-slate-300">{item.planned_units}</strong></span>
                                      <span className="text-slate-700">•</span>
                                      <span>Produced: <strong className="text-slate-300">{item.actual_units}</strong></span>
                                      <span className="text-slate-700">•</span>
                                      <span className="text-rose-400 font-semibold font-sans">{item.deficit_pct}% Deficit</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side actions */}
                                <div className="flex items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end border-t border-slate-800 sm:border-0 pt-3 sm:pt-0">
                                  
                                  {/* Status badges */}
                                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${statusStyle} shrink-0`}>
                                    {item.status}
                                  </span>

                                  {/* Severity badges */}
                                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${severityStyle} shrink-0`}>
                                    {item.severity}
                                  </span>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {item.status === "open" && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(item.id, "acknowledged");
                                        }}
                                        title="Acknowledge exception"
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
                                      >
                                        <Clock className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {item.status !== "resolved" && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(item.id, "resolved");
                                        }}
                                        title="Resolve exception"
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 border border-slate-700/50 transition-colors"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setSelectedId(isSelected ? null : item.id)}
                                      title="View detail trend"
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        isSelected 
                                          ? 'bg-violet-600 border-violet-500 text-white' 
                                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/50'
                                      }`}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Details & Trend Side Panel */}
          <aside className={`w-full lg:w-96 shrink-0 bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-xl p-6 transition-all duration-300 lg:sticky lg:top-24 self-start ${
            selectedId !== null ? 'opacity-100 translate-y-0' : 'opacity-70 border-dashed border-slate-800'
          }`}>
            
            {selectedId === null ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                <Info className="h-8 w-8 text-slate-600" />
                <h4 className="font-semibold text-sm text-slate-400">No Exception Selected</h4>
                <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
                  Click the eye icon on any exception row to load its details and 7-day trend chart.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 text-violet-500 animate-spin" />
                <span className="text-xs text-slate-400">Loading trend details...</span>
              </div>
            ) : detailData ? (
              
              /* Drawer Content */
              <div className="flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Exception analysis</span>
                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2 mt-1">
                      {detailData.exception.product_code}
                      <span className="text-xs font-normal text-slate-500">({detailData.exception.plant_id})</span>
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 gap-3 bg-[#0a0f1d] border border-slate-800/60 rounded-lg p-3 text-xs font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-200 font-semibold">{detailData.exception.date}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Severity</span>
                    <span className={`font-semibold capitalize ${
                      detailData.exception.severity === "high" ? "text-rose-400" : "text-amber-400"
                    }`}>{detailData.exception.severity}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Planned Units</span>
                    <span className="text-slate-200 font-semibold">{detailData.exception.planned_units}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Produced Units</span>
                    <span className="text-slate-200 font-semibold">{detailData.exception.actual_units}</span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5 border-t border-slate-800/80 pt-2 mt-1">
                    <span className="text-slate-500">Deficit Percentage</span>
                    <span className="text-rose-400 font-bold text-sm font-sans">{detailData.exception.deficit_pct}%</span>
                  </div>
                </div>

                {/* Trend Visualizer */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-violet-400" />
                    7-Day Trend (Plan vs Actual)
                  </span>

                  {/* SVG Bar Chart */}
                  <div className="bg-[#0a0f1d] border border-slate-800/60 rounded-xl p-4 flex flex-col gap-4">
                    
                    {/* SVG Canvas */}
                    <div className="h-44 w-full flex items-end justify-between relative mt-2 px-1">
                      
                      {/* Vertical Grid Lines and labels */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="border-t border-slate-100 w-full" />
                        <div className="border-t border-slate-100 w-full" />
                        <div className="border-t border-slate-100 w-full" />
                        <div className="border-t border-slate-100 w-full" />
                      </div>

                      {/* Render Bars */}
                      {detailData.trend.map((pt, idx) => {
                        const maxVal = Math.max(...detailData.trend.map(p => Math.max(p.planned_units, p.actual_units)), 10);
                        
                        // Height percentages
                        const planHeight = (pt.planned_units / maxVal) * 100;
                        const actHeight = (pt.actual_units / maxVal) * 100;
                        
                        // Format date to small format (e.g. "03/15")
                        const dateParts = pt.date.split("-");
                        const dateLabel = `${dateParts[1]}/${dateParts[2]}`;

                        // Is deficit today?
                        const isDeficit = pt.actual_units < 0.9 * pt.planned_units && pt.planned_units > 0;
                        const actualColor = isDeficit 
                          ? "from-rose-500 to-rose-600 shadow-rose-500/10" 
                          : "from-emerald-500 to-emerald-600 shadow-emerald-500/10";

                        return (
                          <div key={pt.date} className="flex flex-col items-center gap-2 group/bar w-[12%]">
                            
                            {/* Bar heights */}
                            <div className="h-32 w-full flex items-end justify-center gap-[2px] relative">
                              
                              {/* Planned Bar */}
                              <div 
                                style={{ height: `${planHeight}%` }} 
                                className="w-1/2 bg-slate-700/80 hover:bg-slate-600/80 rounded-t-sm transition-all duration-300 relative group-hover/bar:bg-slate-500"
                                title={`Planned: ${pt.planned_units}`}
                              />
                              
                              {/* Actual Bar */}
                              <div 
                                style={{ height: `${actHeight}%` }} 
                                className={`w-1/2 bg-gradient-to-t ${actualColor} rounded-t-sm shadow-md transition-all duration-300`}
                                title={`Actual: ${pt.actual_units}`}
                              />

                              {/* Tooltip on Hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:flex flex-col bg-[#070b15] border border-slate-800 rounded p-1.5 text-[9px] font-mono whitespace-nowrap z-50 shadow-xl">
                                <span className="text-slate-400">Plan: <strong className="text-slate-200">{pt.planned_units}</strong></span>
                                <span className="text-slate-400">Act: <strong className="text-slate-200">{pt.actual_units}</strong></span>
                              </div>
                            </div>
                            
                            {/* X-axis Label */}
                            <span className={`text-[9px] font-mono tracking-tighter ${
                              pt.date === detailData.exception.date ? 'text-violet-400 font-bold' : 'text-slate-500'
                            }`}>
                              {dateLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center gap-6 border-t border-slate-800/80 pt-3 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-sm bg-slate-700" />
                        <span>Planned Units</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-sm bg-emerald-500" />
                        <span>Normal Production</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-sm bg-rose-500" />
                        <span>Deficit Exception</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Trend Table list */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Trend Log</span>
                  <div className="border border-slate-800/80 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-[#0a0f1d] border-b border-slate-800 text-slate-500">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Plan</th>
                          <th className="p-2.5 text-right">Actual</th>
                          <th className="p-2.5 text-right text-rose-400">Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {detailData.trend.slice().reverse().map(pt => {
                          const gap = pt.planned_units - pt.actual_units;
                          const gapPct = pt.planned_units > 0 ? ((gap / pt.planned_units) * 100).toFixed(0) : "0";
                          const isDeficit = pt.actual_units < 0.9 * pt.planned_units && pt.planned_units > 0;
                          
                          return (
                            <tr key={pt.date} className={pt.date === detailData.exception.date ? "bg-violet-950/20" : ""}>
                              <td className="p-2.5 text-slate-400">{pt.date}</td>
                              <td className="p-2.5 text-right">{pt.planned_units}</td>
                              <td className="p-2.5 text-right">{pt.actual_units}</td>
                              <td className={`p-2.5 text-right font-semibold ${isDeficit ? 'text-rose-400' : 'text-slate-500'}`}>
                                {gap > 0 ? `-${gapPct}%` : '0%'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detail Actions */}
                <div className="flex items-center gap-2 border-t border-slate-800/80 pt-5 mt-2">
                  {detailData.exception.status === "open" && (
                    <button 
                      onClick={() => handleUpdateStatus(detailData.exception.id, "acknowledged")}
                      className="flex-1 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs border border-violet-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                  {detailData.exception.status !== "resolved" && (
                    <button 
                      onClick={() => handleUpdateStatus(detailData.exception.id, "resolved")}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  )}
                  {detailData.exception.status === "resolved" && (
                    <div className="flex-1 py-2 px-3 rounded-lg bg-slate-800 border border-slate-700/50 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Status: Resolved
                    </div>
                  )}
                </div>

              </div>
            ) : null}

          </aside>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Destilea Manufacturing Operations. Intern Hiring Test Assignment.</p>
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
            <span>Powered by Gemini & UV</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
