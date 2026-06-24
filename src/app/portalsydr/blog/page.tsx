"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

export default function AdminBlog() {
  const [title, setTitle] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px] text-white",
      },
    },
  });

  const fetchPosts = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { fetchPosts(); }, []);

  const resetForm = () => {
    setTitle("");
    editor?.commands.setContent("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setEditingId(null);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return null;
    setUploading(true);
    const fileExt = thumbnailFile.name.split(".").pop();
    const fileName = `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from("blog-images").upload(fileName, thumbnailFile);
    if (error) {
      toast.error("Thumbnail upload failed");
      setUploading(false);
      return null;
    }
    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(fileName);
    setUploading(false);
    return urlData.publicUrl;
  };

  const handleImageUploadInEditor = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from("blog-images").upload(fileName, file);
      if (error) {
        toast.error("Image upload failed");
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(fileName);
      editor?.chain().focus().setImage({ src: urlData.publicUrl }).run();
      setUploading(false);
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const content = editor.getHTML();
    let imageUrl: string | null = null;
    if (thumbnailFile) {
      imageUrl = await uploadThumbnail();
      if (!imageUrl) return;
    }

    if (editingId) {
      const updateData: any = { title, content };
      if (imageUrl) updateData.image_url = imageUrl;
      const { error } = await supabase.from("blog_posts").update(updateData).eq("id", editingId);
      if (error) {
        toast.error("Failed to update post");
        return;
      }
      toast.success("Post updated!");
    } else {
      const { error } = await supabase.from("blog_posts").insert([{ title, content, image_url: imageUrl }]);
      if (error) {
        toast.error("Failed to create post");
        return;
      }
      toast.success("Post published!");
    }
    resetForm();
    fetchPosts();
  };

  const handleEdit = (post: any) => {
    setEditingId(post.id);
    setTitle(post.title);
    editor?.commands.setContent(post.content || "");
    if (post.image_url) {
      setThumbnailPreview(post.image_url);
      setThumbnailFile(null);
    } else {
      setThumbnailPreview(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Deleted");
    fetchPosts();
  };

  // --- Top Story toggle ---
  const toggleTopStory = async (post: any) => {
    const now = new Date();
    const isTop = post.top_story_until && new Date(post.top_story_until) > now;
    if (isTop) {
      // Remove top story
      const { error } = await supabase.from("blog_posts").update({ top_story_until: null }).eq("id", post.id);
      if (error) toast.error("Failed to remove top story");
      else toast.success("Removed from top stories");
    } else {
      // Set top story for next 24 hours
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { error } = await supabase.from("blog_posts").update({ top_story_until: expires.toISOString() }).eq("id", post.id);
      if (error) toast.error("Failed to set top story");
      else toast.success("Set as top story (24h)");
    }
    fetchPosts();
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">{editingId ? "Edit Post" : "New Post"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-10 bg-surface-card p-6 rounded-2xl border border-white/10">
        <input
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white/5 border border-white/10 p-2 rounded text-white"
          required
        />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Thumbnail (optional)</label>
          <input type="file" accept="image/*" onChange={handleThumbnailChange} className="text-sm text-gray-300" />
          {thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="mt-2 h-32 w-auto rounded-lg object-cover" />}
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">Bold</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">Italic</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">H2</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">H3</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">Bullet List</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="px-2 py-1 bg-white/5 rounded text-sm hover:bg-white/10">Numbered List</button>
          <button type="button" onClick={handleImageUploadInEditor} disabled={uploading} className="px-2 py-1 bg-gold-400/20 text-gold-400 rounded text-sm hover:bg-gold-400/30">
            {uploading ? "Uploading..." : "📷 Image"}
          </button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded p-3 min-h-[200px]">
          <EditorContent editor={editor} />
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="bg-gold-400 text-black">{editingId ? "Update Post" : "Publish Post"}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </form>

      <div className="space-y-3">
        {posts.map((post) => {
          const isTop = post.top_story_until && new Date(post.top_story_until) > new Date();
          return (
            <div key={post.id} className="bg-surface-card p-4 rounded-xl border border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {post.image_url && <img src={post.image_url} alt="thumb" className="h-12 w-12 rounded object-cover" />}
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                  {isTop && <p className="text-xs text-gold-400">⭐ Top Story</p>}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => toggleTopStory(post)} className="text-gold-400 text-sm hover:underline">
                  {isTop ? "Remove Top" : "Set as Top"}
                </button>
                <button onClick={() => handleEdit(post)} className="text-gold-400 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(post.id)} className="text-red-400 text-sm hover:underline">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
