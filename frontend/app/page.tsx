'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploading(true);
        setMessage('Getting upload URL...');

        const file = e.target.files[0];

        try {
            // 1. Get Presigned URL
            // In a real deployment, these URLs would be environment variables or fetched from a config.
            // For now we'll put a placeholder or expect the user to configure it.
            const API_URL = process.env.NEXT_PUBLIC_UPLOAD_API_URL;
            if (!API_URL) {
                throw new Error('Upload API URL not configured');
            }

            const res = await fetch(API_URL);
            const { uploadUrl, key } = await res.json();

            setMessage('Uploading to S3...');

            // 2. Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': 'application/pdf'
                }
            });

            setMessage('Upload successful! Processing started.');
        } catch (err) {
            console.error(err);
            setMessage('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
                    AWS Resume Intelligence
                </h1>
                <Link href="/dashboard" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Go to Dashboard
                </Link>
            </div>

            <div className="relative flex flex-col place-items-center gap-8 mt-20">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-2xl w-[600px] text-center border border-gray-100 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Upload Resume (PDF)</h2>
                    <p className="mb-8 text-gray-500">
                        Drag and drop or review the architecture logic.
                    </p>

                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-all group border-blue-300">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {uploading ? (
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                                ) : (
                                    <>
                                        <svg className="w-10 h-10 mb-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF (MAX. 5MB)</p>
                                    </>
                                )}
                            </div>
                            <input
                                id="dropzone-file"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 rounded-md ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
