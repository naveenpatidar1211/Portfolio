'use client'

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaUser, FaTags, FaHeart, FaShare, FaComment, FaChevronDown, FaChevronUp, FaStickyNote, FaCode, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    date: string;
    tags: string[];
    imageUrl?: string;
    readTime?: number;
    likesCount?: number;
    dislikesCount?: number;
}

interface CommentItem {
    id: string;
    author?: string;
    content: string;
    likes: number;
    dislikes: number;
    created_at: string;
    parent_id?: string | null;
}

interface CommentNode extends CommentItem {
    children: CommentNode[];
}

// Using react-markdown + rehype plugins for safe rich content rendering
function sanitizeHtml(html: string) {
    // Minimal sanitization: strip script/style tags and on* attributes
    const withoutScripts = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]+/gi, '');
    return withoutScripts;
}

const BlogDetail: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [notes, setNotes] = useState<string>('');
    const [commentText, setCommentText] = useState<string>('');
    const [readerName, setReaderName] = useState<string>('');
    const [isLiked, setIsLiked] = useState(false);
    const [shareToast, setShareToast] = useState<string | null>(null);
    const [openReply, setOpenReply] = useState<Record<string, boolean>>({});
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isPracticeOpen, setIsPracticeOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // NextAuth session
    const { data: session } = useSession();
    const [loginOpen, setLoginOpen] = useState(false);

    // Like in-flight/cooldown flags
    const [likingBlog, setLikingBlog] = useState(false);
    const [likingComments, setLikingComments] = useState<Record<string, boolean>>({});

// Initialize reader name and like state from localStorage
    useEffect(() => {
        const key = `blog_like_${id}`;
        const liked = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        setIsLiked(!!liked);
        const savedName = typeof window !== 'undefined' ? localStorage.getItem('reader_name') : null;
        if (savedName) setReaderName(savedName);
    }, [id]);

    // Fetch blog and comments
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                setLoading(true);
                const [blogRes, commentsRes] = await Promise.all([
                    fetch(`/api/blogs/${id}`),
                    fetch(`/api/blogs/${id}/comments`),
                ]);
                const blogJson = await blogRes.json();
                const commentsJson = await commentsRes.json();
                if (!isMounted) return;

                if (blogJson.success) {
                    const b = blogJson.data as any;
                    setBlog({
                        id: b.id,
                        title: b.title,
                        excerpt: b.excerpt,
                        content: b.content,
                        author: b.author || 'Naveen Patidar',
                        date: b.date,
                        tags: b.tags || [],
                        imageUrl: b.imageUrl,
                        readTime: b.readTime,
                        likesCount: b.likesCount ?? 0,
                        dislikesCount: b.dislikesCount ?? 0,
                    });
                } else {
                    setError(blogJson.error || 'Failed to load blog');
                }

                if (commentsJson.success) {
                    setComments(commentsJson.data || []);
                }
                setError(null);
            } catch (e) {
                console.error(e);
                setError('Failed to load blog');
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        load();
        return () => { isMounted = false; };
    }, [id]);

    const sanitizedContent = useMemo(() => sanitizeHtml(blog?.content || ''), [blog?.content]);

    const nestedComments: CommentNode[] = useMemo(() => {
        const map = new Map<string, CommentNode>();
        const roots: CommentNode[] = [];
        comments.forEach((c) => {
            map.set(c.id, { ...c, children: [] });
        });
        map.forEach((node) => {
            if (node.parent_id && map.has(node.parent_id)) {
                map.get(node.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });
        return roots;
    }, [comments]);

    const handleLike = async () => {
        if (!blog) return;
        if (isLiked || likingBlog) return; // prevent multiple likes and rapid re-clicks
        setLikingBlog(true);
        try {
            const res = await fetch(`/api/blogs/${id}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'like' }),
            });
            const data = await res.json();
            if (data.success) {
                setBlog(prev => prev ? { ...prev, likesCount: data.data.likesCount } : prev);
                setIsLiked(true);
                try { localStorage.setItem(`blog_like_${id}`, '1'); } catch {}
            }
        } catch (e) { /* noop */ }
        finally {
            // small cooldown
            setTimeout(() => setLikingBlog(false), 1200);
        }
    };


    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            const author = readerName?.trim() || undefined;
            const res = await fetch(`/api/blogs/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText.trim(), author }),
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => [...prev, data.data]);
                setCommentText('');
                try { if (readerName?.trim()) localStorage.setItem('reader_name', readerName.trim()); } catch {}
            }
        } catch (e) { /* noop */ }
    };

    const handleCommentLike = async (commentId: string) => {
        const key = `comment_like_${commentId}`;
        const liked = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (liked || likingComments[commentId]) return;
        setLikingComments(prev => ({ ...prev, [commentId]: true }));
        try {
            const res = await fetch(`/api/blogs/${id}/comments/${commentId}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'like' }),
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: data.data.likes } : c));
                try { localStorage.setItem(key, '1'); } catch {}
            }
        } catch (e) { /* noop */ }
        finally {
            setTimeout(() => setLikingComments(prev => ({ ...prev, [commentId]: false })), 800);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600 dark:text-gray-300">{error || 'Blog not found'}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content */}
                    <div className={`${isSidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
                        <motion.article
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
                        >
                            {blog.imageUrl && (
                                <img
                                    src={blog.imageUrl}
                                    alt={blog.title}
                                    className="w-full h-96 object-cover"
                                />
                            )}
                            <div className="p-8">
                                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                    {blog.title}
                                </h1>
                                <div className="flex items-center text-gray-600 dark:text-gray-300 mb-8">
                                    <div className="flex items-center mr-4">
                                        <FaUser className="mr-2" />
                                        <span>{blog.author}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <FaCalendarAlt className="mr-2" />
                                        <span>{blog.date}</span>
                                    </div>
                                </div>
<ReactMarkdown
                                    className="prose prose-slate dark:prose-invert max-w-none"
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                                >
                                    {blog.content}
                                </ReactMarkdown>
                                <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={handleLike}
                                            className={`flex items-center space-x-2 ${
                                                isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
                                            }`}
                                        >
                                            <FaHeart />
                                            <span>{(blog.likesCount || 0)}</span>
                                        </button>
<button
                                            className="text-gray-600 dark:text-gray-300"
                                            onClick={async () => {
                                                const url = typeof window !== 'undefined' ? window.location.href : '';
                                                try {
                                                    // Use Web Share API if available
                                                    // @ts-ignore
                                                    if (navigator.share) {
                                                        // @ts-ignore
                                                        await navigator.share({ title: blog.title, url });
                                                    } else if (navigator.clipboard) {
                                                        await navigator.clipboard.writeText(url);
                                                        setShareToast('Link copied');
                                                        setTimeout(() => setShareToast(null), 2000);
                                                    }
                                                } catch {}
                                            }}
                                        >
                                            <FaShare />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {blog.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                            >
                                                <FaTags className="mr-1" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
</div>
                            </div>
                        </motion.article>

                        {shareToast && (
                            <div className="mt-4 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-3 py-2 rounded-md inline-block">
                                {shareToast}
                            </div>
                        )}

                        {/* Login options modal (Google only for now) */}
                        {loginOpen && !session?.user && (
                            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Continue to comment</h3>
                                        <button className="text-gray-500" onClick={() => setLoginOpen(false)}>✕</button>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Choose a sign-in option:</p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => { setLoginOpen(false); signIn('google'); }}
                                            className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                        >
                                            Continue with Google
                                        </button>
                                        {/* Future: add more providers here */}
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Comments Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                Comments ({comments.length})
                            </h2>
                            {/* Require auth for commenting: show a single "Comment" button that opens login options */}
                            {!session?.user ? (
                                <div className="mb-8">
                                    <button
                                        onClick={() => setLoginOpen(true)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Comment
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCommentSubmit} className="mb-8 space-y-3">
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder={`Comment as ${session.user.name || session.user.email}`}
                                            className="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                            rows={4}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                        >
                                            Post Comment
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => signOut()}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </form>
                            )}
                            <div className="space-y-6">
                                {nestedComments.map((c) => (
                                    <div
                                        key={c.id}
                                        className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center">
                                                <FaUser className="text-gray-600 dark:text-gray-300 mr-2" />
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {c.author || 'Anonymous'}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(c.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                                            {c.content}
                                        </p>
                                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                                            <button className="flex items-center mr-4" onClick={() => handleCommentLike(c.id)}>
                                                <FaHeart className="mr-1" />
                                                <span>{c.likes}</span>
                                            </button>
                                            <button className="flex items-center" onClick={() => setOpenReply(prev => ({...prev, [c.id]: !prev[c.id]}))}>
                                                <FaComment className="mr-1" />
                                                <span>{openReply[c.id] ? 'Cancel' : 'Reply'}</span>
                                            </button>
                                        </div>

                                        {openReply[c.id] && session?.user && (
                                            <form
                                                onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    const text = (replyTexts[c.id] || '').trim();
                                                    if (!text) return;
                                                    try {
                                                        const author = readerName?.trim() || undefined;
                                                        const res = await fetch(`/api/blogs/${id}/comments`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ content: text, author, parentId: c.id }),
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) {
                                                            setComments(prev => [...prev, data.data]);
                                                            setReplyTexts(prev => ({ ...prev, [c.id]: '' }));
                                                            setOpenReply(prev => ({ ...prev, [c.id]: false }));
                                                            try { if (readerName?.trim()) localStorage.setItem('reader_name', readerName.trim()); } catch {}
                                                        }
                                                    } catch {}
                                                }}
                                                className="mt-4 space-y-2"
                                            >
                                                <div className="flex flex-col md:flex-row gap-2">
                                                    <input
                                                        type="text"
                                                        value={replyTexts[c.id] || ''}
                                                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                        placeholder="Write a reply..."
                                                        className="flex-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                                                >
                                                    Post Reply
                                                </button>
                                            </form>
                                        )}

                                        {c.children.length > 0 && (
                                            <div className="mt-4 pl-6 border-l border-gray-200 dark:border-gray-700 space-y-4">
                                                {c.children.map(child => (
                                                    <div key={child.id}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center">
                                                                <FaUser className="text-gray-600 dark:text-gray-300 mr-2" />
                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                    {child.author || 'Anonymous'}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(child.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 dark:text-gray-300 mb-2">{child.content}</p>
                                                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                                                            <button className="flex items-center mr-4" onClick={() => handleCommentLike(child.id)}>
                                                                <FaHeart className="mr-1" />
                                                                <span>{child.likes}</span>
                                                            </button>
                                                            <button className="flex items-center" onClick={() => setOpenReply(prev => ({...prev, [child.id]: !prev[child.id]}))}>
                                                                <FaComment className="mr-1" />
                                                                <span>{openReply[child.id] ? 'Cancel' : 'Reply'}</span>
                                                            </button>
                                                        </div>

                                                        {openReply[child.id] && session?.user && (
                                                            <form
                                                                onSubmit={async (e) => {
                                                                    e.preventDefault();
                                                                    const text = (replyTexts[child.id] || '').trim();
                                                                    if (!text) return;
                                                                    try {
                                                                        const author = readerName?.trim() || undefined;
                                                                        const res = await fetch(`/api/blogs/${id}/comments`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ content: text, author, parentId: child.id }),
                                                                        });
                                                                        const data = await res.json();
                                                                        if (data.success) {
                                                                            setComments(prev => [...prev, data.data]);
                                                                            setReplyTexts(prev => ({ ...prev, [child.id]: '' }));
                                                                            setOpenReply(prev => ({ ...prev, [child.id]: false }));
                                                                            try { if (readerName?.trim()) localStorage.setItem('reader_name', readerName.trim()); } catch {}
                                                                        }
                                                                    } catch {}
                                                                }}
                                                                className="mt-3 space-y-2"
                                                            >
                                                                <div className="flex flex-col md:flex-row gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={replyTexts[child.id] || ''}
                                                                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [child.id]: e.target.value }))}
                                                                        placeholder="Write a reply..."
                                                                        className="flex-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                                                    />
                                                                </div>
                                                                <button type="submit" className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                                                                    Post Reply
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <AnimatePresence>
                        {!isSidebarCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="lg:col-span-4"
                            >
                                <motion.div
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden sticky top-8"
                                >
                                    {/* Notes Section */}
                                    <div className="border-b border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setIsNotesOpen(!isNotesOpen)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <FaStickyNote className="text-purple-600 mr-2" />
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                    Your Notes
                                                </h3>
                                            </div>
                                            {isNotesOpen ? <FaChevronUp /> : <FaChevronDown />}
                                        </button>
                                        <AnimatePresence>
                                            {isNotesOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-4">
                                                        <textarea
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            placeholder="Take notes while reading..."
                                                            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                                            rows={10}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Practice Area Section */}
                                    <div>
                                        <button
                                            onClick={() => setIsPracticeOpen(!isPracticeOpen)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <FaCode className="text-purple-600 mr-2" />
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                    Practice Area
                                                </h3>
                                            </div>
                                            {isPracticeOpen ? <FaChevronUp /> : <FaChevronDown />}
                                        </button>
                                        <AnimatePresence>
                                            {isPracticeOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-4 space-y-4">
                                                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                                                Try it yourself:
                                                            </h4>
                                                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                                                Create a simple React component with TypeScript that displays a list of items.
                                                            </p>
                                                            <textarea
                                                                placeholder="Write your code here..."
                                                                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-600 dark:text-white font-mono"
                                                                rows={8}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-50"
                    >
                        {isSidebarCollapsed ? (
                            <FaChevronLeft className="text-gray-600 dark:text-gray-300" />
                        ) : (
                            <FaChevronRight className="text-gray-600 dark:text-gray-300" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlogDetail; 
