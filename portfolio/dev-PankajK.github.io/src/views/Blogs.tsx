'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaUser, FaTags, FaClock, FaSearch, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    date: string;
    tags: string[];
    imageUrl?: string;
    slug: string;
    readTime: number;
    published: boolean;
    featured: boolean;
}

interface ApiResponse {
    success: boolean;
    data?: BlogPost[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    error?: string;
}

const Blogs: React.FC = () => {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [allTags, setAllTags] = useState<string[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 9,
        totalPages: 0
    });

    const fetchBlogs = useCallback(async (page = 1, search = '', tag = '') => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                published: 'true' // Only fetch published blogs
            });

            if (search) queryParams.append('search', search);
            if (tag) queryParams.append('tag', tag);

            const response = await fetch(`/api/blogs?${queryParams}`);
            const data: ApiResponse = await response.json();

            if (data.success && data.data) {
                setBlogs(data.data);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
                
                // Extract unique tags from blogs
                const tags = new Set<string>();
                data.data.forEach(blog => {
                    blog.tags.forEach(tag => tags.add(tag));
                });
                setAllTags(Array.from(tags).sort());
                
                setError(null);
            } else {
                setError(data.error || 'Failed to fetch blogs');
            }
        } catch (err) {
            console.error('Error fetching blogs:', err);
            setError('Failed to fetch blogs');
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchBlogs(1, searchTerm, selectedTag);
    };

    const handleTagFilter = (tag: string) => {
        setSelectedTag(tag);
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchBlogs(1, searchTerm, tag);
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        fetchBlogs(newPage, searchTerm, selectedTag);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedTag('');
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchBlogs(1, '', '');
    };

    return (
        <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-800">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 drop-shadow-sm">
                        My Blog
                    </h2>
                    <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                        Thoughts, ideas, and insights about web development and technology
                    </p>
                </motion.div>

                {/* Search and Filter Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border-2 border-gray-200/50 dark:border-gray-700"
                >
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search blogs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 outline-none transition-all duration-200"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Search
                            </button>
                        </div>
                    </form>

                    {/* Tags Filter */}
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 py-2">
                                Filter by tags:
                            </span>
                            <button
                                onClick={clearFilters}
                                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                                    !selectedTag
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-800'
                                }`}
                            >
                                All
                            </button>
                            {allTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagFilter(tag)}
                                    className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                                        selectedTag === tag
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-800'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                            <FaSpinner className="animate-spin text-2xl" />
                            <span className="text-lg font-medium">Loading blogs...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 text-center mb-8"
                    >
                        <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
                        <button
                            onClick={() => fetchBlogs()}
                            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                        >
                            Try Again
                        </button>
                    </motion.div>
                )}

                {/* Blogs Grid */}
                {!loading && !error && (
                    <>
                        <AnimatePresence>
                            {blogs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                                    {blogs.map((post, index) => (
                                        <motion.article
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            className="group bg-white/85 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-gray-200/60 dark:border-gray-700"
                                        >
                                            <Link href={`/blogs/${post.slug}`}>
                                                <div className="relative overflow-hidden">
                                                    <img
                                                        src={post.imageUrl || '/api/placeholder/600/300'}
                                                        alt={post.title}
                                                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    {post.featured && (
                                                        <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                                                            Featured
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-6">
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300 line-clamp-2">
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                                                        {post.excerpt}
                                                    </p>
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 space-x-4">
                                                        <div className="flex items-center">
                                                            <FaUser className="mr-1" />
                                                            <span>{post.author}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <FaCalendarAlt className="mr-1" />
                                                            <span>{post.date}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <FaClock className="mr-1" />
                                                            <span>{post.readTime} min read</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {post.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-200 hover:from-purple-200 hover:to-indigo-200 dark:hover:from-purple-800/50 dark:hover:to-indigo-800/50 transition-all duration-200"
                                                            >
                                                                <FaTags className="mr-1" />
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.article>
                                    ))}
                                </div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-20"
                                >
                                    <div className="text-6xl mb-4">📝</div>
                                    <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">No blogs found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                                        {searchTerm || selectedTag
                                            ? 'Try adjusting your search or filters'
                                            : 'No blog posts have been published yet. Check back later!'}
                                    </p>
                                    {(searchTerm || selectedTag) && (
                                        <button
                                            onClick={clearFilters}
                                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex justify-center items-center gap-2 mt-12"
                            >
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    Previous
                                </button>
                                
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                            page === pagination.page
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-500'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    Next
                                </button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Blogs; 