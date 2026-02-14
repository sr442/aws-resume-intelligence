'use client';

import React, { useEffect, useState } from 'react';

type Candidate = {
    candidateId: string;
    name: string;
    email: string;
    score: number;
    skills: string[];
    status: string;
};

export default function Dashboard() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCandidates() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_LIST_API_URL;
                if (!API_URL) return; // Wait for config

                const res = await fetch(API_URL);
                const data = await res.json();
                setCandidates(data);
            } catch (err) {
                console.error('Failed to fetch candidates', err);
            } finally {
                setLoading(false);
            }
        }

        fetchCandidates();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-10">
            <header className="mb-10 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Candidate Intelligence Dashboard</h1>
                <div className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm">
                    Live Mode
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600">Candidate</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Score</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Top Skills</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-10">Loading Intelligence...</td></tr>
                            ) : candidates.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No candidates processed yet. Upload a resume to start.</td></tr>
                            ) : (
                                candidates.map((c) => (
                                    <tr key={c.candidateId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{c.name || 'Unknown'}</div>
                                            <div className="text-sm text-gray-500">{c.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`text-lg font-bold ${c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {c.score}
                                                </div>
                                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${c.score >= 80 ? 'bg-green-500' : c.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${c.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {c.skills?.slice(0, 3).map(s => (
                                                    <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                                PROCESSED
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
