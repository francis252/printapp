import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Sparkles, Library, Menu, X, Trash2, LogOut } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const handleDelete = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setDeletingId(projectId);
    await base44.entities.Project.delete(projectId);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    setDeletingId(null);
  };

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentUser?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: currentUser.email }, "-created_date"),
    enabled: !!currentUser,
  });

  return (
    <div className="min-h-screen bg-background font-inter overflow-x-hidden w-full">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-accent rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)] overflow-x-hidden w-full flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? "fixed lg:static inset-0 top-[80px] z-40" : "hidden lg:flex lg:flex-col"
        } w-64 border-r border-border bg-card p-6 space-y-4 overflow-y-auto`}>
          <Link to="/mockup" onClick={() => setSidebarOpen(false)}>
            <Button className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Start New Mockup
            </Button>
          </Link>

          <div className="space-y-1 flex-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-primary font-semibold"
            >
              <FileText className="w-4 h-4" />
              Projects
            </button>
            <Link to="/products" onClick={() => setSidebarOpen(false)} className="block">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
                <Library className="w-4 h-4" />
                Products
              </button>
            </Link>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => base44.auth.logout("/")}
            className="w-full gap-2 text-destructive hover:text-destructive mt-auto"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0 w-full">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 w-full min-w-0">
            {/* Mobile Navigation */}
            <div className="lg:hidden mb-6 space-y-3">
              <Link to="/mockup">
                <Button className="w-full gap-2">
                  <Sparkles className="w-4 h-4" />
                  Start New Mockup
                </Button>
              </Link>
              <div className="flex rounded-lg border border-input bg-background overflow-hidden">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium bg-primary text-primary-foreground"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Projects
                </button>
                <Link to="/products" className="flex-1 border-l border-input">
                  <button className="w-full h-full flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                    <Library className="w-3.5 h-3.5" />
                    Products
                  </button>
                </Link>
              </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-6">Recent Projects</h2>
        
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">No projects yet. Create one to get started!</p>
                    <Link to="/mockup" className="mt-4 inline-block">
                      <Button>Create First Project</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projects.map((project) => (
                      <div key={project.id} className="relative group">
                        <Link to="/mockup" state={{ project }}>
                          <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all">
                            {project.thumbnail && (
                              <img src={project.thumbnail} alt={project.name} className="w-full h-40 object-cover" />
                            )}
                            <div className="p-4 space-y-2">
                              <h3 className="font-semibold truncate">{project.name}</h3>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(project.created_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          disabled={deletingId === project.id}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-card/90 shadow text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        </main>
      </div>
    </div>
  );
}