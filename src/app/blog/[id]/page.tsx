"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import AdBanner from "@/components/AdBanner";
import LoadingScreen from "@/components/LoadingScreen";

export default function BlogPostPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch("/api/get-blog-posts")
      .then((r) => r.json())
      .then((data) => {
        const found = data.posts?.find((p: any) => p.id === id);
        setPost(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingScreen message="Loading article…" />;
  if (!post) {
    return (
      <div className="min-h-screen bg-surface-primary text-white flex items-center justify-center pb-24 lg:pb-0">
        <p className="text-gray-400">Article not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary text-white flex flex-col pb-24 lg:pb-0">
      <PublicHeader />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Article content */}
          <article className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <p className="text-sm text-gray-400 mb-8">{new Date(post.created_at).toLocaleDateString()}</p>
            <div className="prose prose-invert max-w-none prose-headings:text-gold-400 prose-a:text-gold-400" dangerouslySetInnerHTML={{ __html: post.content }} />
            <a href="/blog" className="text-gold-400 hover:underline mt-8 inline-block">← Back to Blog</a>
          </article>

          {/* Inline ad after article on mobile, sidebar on desktop */}
          <div className="lg:hidden mt-8">
            <AdBanner variant="banner" />
          </div>

          <aside className="hidden lg:block lg:w-72 space-y-6">
            <div className="lg:sticky lg:top-24">
              <AdBanner variant="sidebar" className="mb-6" />
              <AdBanner variant="sidebar" />
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}