"use client";
import { useState, useEffect, useCallback } from "react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import AdBanner from "@/components/AdBanner";
import LoadingScreen from "@/components/LoadingScreen";

function stripHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [topStories, setTopStories] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/get-blog-posts");
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
        const now = new Date();
        const top = data.posts.filter(
          (p: any) => p.top_story_until && new Date(p.top_story_until) > now
        );
        setTopStories(top.slice(0, 3));
      }
    } catch (err) {
      console.error("Failed to fetch blog posts", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (topStories.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % topStories.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [topStories]);

  const rows: any[][] = [];
  for (let i = 0; i < posts.length; i += 3) rows.push(posts.slice(i, i + 3));

  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-8 sm:mb-10 text-center tracking-tight">
          Blog
        </h1>

        {loading ? (
          <LoadingScreen message="Loading articles…" />
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400">No articles yet.</p>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Top Stories */}
            {topStories.length > 0 && (
              <>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">🔥 Top Stories</h2>
                <div className="relative w-full h-56 sm:h-80 lg:h-96 rounded-2xl overflow-hidden mb-8 sm:mb-12">
                  <motion.div
                    className="flex h-full"
                    animate={{ x: `-${currentSlide * 100}%` }}
                    transition={{ ease: "easeInOut", duration: 0.8 }}
                  >
                    {topStories.map((story) => (
                      <Link key={story.id} href={`/blog/${story.id}`} className="w-full h-full flex-shrink-0 relative">
                        {story.image_url ? (
                          <img src={story.image_url} alt={story.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface-card flex items-center justify-center">
                            <span className="text-lg sm:text-2xl font-semibold text-gold-400">{story.title}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
                          <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">{story.title}</h3>
                          <p className="hidden sm:block text-sm sm:text-base text-gray-300 mt-1 sm:mt-2 line-clamp-2">
                            {stripHtml(story.content).substring(0, 120)}...
                          </p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex gap-2 z-10">
                    {topStories.map((_, i) => (
                      <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 w-2 rounded-full transition-all ${i === currentSlide ? "bg-gold-400 w-4" : "bg-white/50"}`} />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="mb-8 sm:mb-10">
              <AdBanner variant="banner" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">📝 Latest Articles</h2>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {row.map((post: any) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="bg-surface-card border border-white/5 rounded-2xl overflow-hidden hover:border-gold-400/20 transition-all hover:-translate-y-1 sm:hover:-translate-y-2 flex flex-col h-full">
                      {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-40 sm:h-48 lg:h-52 object-cover" />}
                      <div className="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 line-clamp-2">{post.title}</h2>
                        <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-4">{new Date(post.created_at).toLocaleDateString()}</p>
                        <p className="text-gray-300 text-sm sm:text-base flex-1">{stripHtml(post.content).substring(0, 120)}...</p>
                        <span className="text-gold-400 text-sm sm:text-base font-semibold mt-3 sm:mt-4 inline-block hover:underline">Read more →</span>
                      </div>
                    </Link>
                  ))}
                </div>
                {rowIndex % 2 === 0 && rowIndex !== rows.length - 1 && (
                  <div className="my-6 sm:my-8">
                    <AdBanner variant="inline" />
                  </div>
                )}
              </div>
            ))}
            <div className="mt-10 sm:mt-14">
              <AdBanner variant="banner" />
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}