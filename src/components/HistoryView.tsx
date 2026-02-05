import React, { useEffect, useState } from 'react';
import { FileText, Clock, ExternalLink, Calendar } from 'lucide-react';

interface Report {
    id: string;
    date: string;
    path: string;
}

const HistoryView = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/api/reports')
            .then(res => res.json())
            .then(data => {
                setReports(data.reports);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load reports", err);
                setLoading(false);
            });
    }, []);

    const openReport = (path: string) => {
        window.open(`http://localhost:8000${path}`, '_blank');
    };

    return (
        <div className="flex-1 p-8 bg-black/20 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-400" />
                <span>Test History</span>
            </h2>

            {loading ? (
                <div className="text-muted-foreground animate-pulse">Loading reports...</div>
            ) : reports.length === 0 ? (
                <div className="text-muted-foreground">No reports found yet. Run a task to generate one!</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => openReport(report.path)}
                            className="bg-card border border-white/10 rounded-xl p-4 hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:scale-110 transition-transform">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <h3 className="font-semibold text-white mb-1 truncate">Task {report.id}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                <Clock className="w-3 h-3" />
                                {report.date}
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                                <span className="text-[10px] uppercase tracking-wider bg-green-500/10 text-green-400 px-2 py-0.5 rounded">Completed</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryView;
