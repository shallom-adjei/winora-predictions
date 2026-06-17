"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function BlogPostPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setPost(data));
  }, [id]);

  if (!post) {
    return (
      <div className="min-h-screen bg-surface-primary text-white flex items-center justify-center pb-24 lg:pb-0">
        <PublicHeader />
        <p className="text-gray-400">Loading...</p>
        <Footer />
        <MobileBottomNav />
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
            <p className="text-sm text-gray-400 mb-8">
              {new Date(post.created_at).toLocaleDateString()}
            </p>

            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <a href="/blog" className="text-gold-400 hover:underline mt-8 inline-block">
              ← Back to Blog
            </a>
          </article>

          {/* Sidebar with ads (sticky on desktop) */}
          <aside className="lg:w-72 space-y-6">
            <div className="lg:sticky lg:top-24">
              {/* Ad 1 */}
              <div className="w-full h-40 bg-surface-card border border-white/5 rounded-xl flex items-center justify-center text-gray-500 text-sm mb-6">
                Advertisement
              </div>

              {/* Ad 2 */}
              <div className="w-full h-40 bg-surface-card border border-white/5 rounded-xl flex items-center justify-center text-gray-500 text-sm">
                Advertisement
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}