import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink } from "lucide-react";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Project } from "@shared/schema";

interface ProjectSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  projects?: Array<{ id: string; projectNumber: string; name: string }>;
  parentId?: string;
}

export function ProjectSelect({
  value,
  onValueChange,
  placeholder = "Select project...",
  testId = "select-project",
  className,
  projects: externalProjects,
  parentId
}: ProjectSelectProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: internalProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !externalProjects,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const projects = externalProjects || (internalProjects as any[]).map((p: any) => ({
    id: p.id,
    projectNumber: p.projectNumber || '',
    name: p.name,
  }));

  useEffect(() => {
    const handleEntityCreated = (event: CustomEvent) => {
      const { entityType, entity, parentId: eventParentId } = event.detail;
      const myParentId = parentId || testId;
      if (entityType === 'project' && entity?.id && eventParentId === myParentId) {
        onValueChange?.(entity.id);
      }
    };

    window.addEventListener('entity-created', handleEntityCreated as EventListener);
    return () => {
      window.removeEventListener('entity-created', handleEntityCreated as EventListener);
    };
  }, [onValueChange, parentId, testId]);

  const selectedProject = projects.find(p => p.id === value);

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between", className)}
              data-testid={testId}
            >
              <span
                className={cn("truncate", value && selectedProject ? "cursor-pointer hover:underline" : "")}
                title={value && selectedProject ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedProject) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: {
                      id: `edit-project-${value}`,
                      name: selectedProject.projectNumber || selectedProject.name,
                      formType: 'project',
                    }
                  }));
                }}
              >
                {selectedProject
                  ? (selectedProject.projectNumber
                      ? `${selectedProject.projectNumber} - ${selectedProject.name}`
                      : selectedProject.name)
                  : placeholder}
              </span>
              {value && selectedProject && (
                <RefreshIconButton queryKeys={["/api/projects"]} className="ml-auto" />
              )}
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 max-h-[300px]" 
            align="start" 
            sideOffset={4}
            style={{ width: 'var(--radix-popover-trigger-width)' }}
          >
            <Command
              filter={(value, search) => {
                if (value === '__clear__') return search ? 0 : 1;
                const project = projects.find(p => p.id === value);
                if (!project) return 0;
                const searchLower = search.toLowerCase();
                return (
                  project.name?.toLowerCase().includes(searchLower) ||
                  project.projectNumber?.toLowerCase().includes(searchLower)
                ) ? 1 : 0;
              }}
            >
              <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <CommandInput 
                  placeholder="Search projects..." 
                  className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
                />
                <div className="flex-shrink-0 ml-auto">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => {
                      const uniqueTabId = `project-new-${Date.now()}`;
                      window.dispatchEvent(new CustomEvent('open-form-tab', {
                        detail: {
                          id: uniqueTabId,
                          name: 'New Project',
                          formType: 'project',
                          parentId: parentId || testId
                        }
                      }));
                      setOpen(false);
                    }}
                    data-testid={`button-add-project-${parentId || testId}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CommandList>
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onValueChange?.("");
                        setOpen(false);
                      }}
                      className="text-muted-foreground italic"
                    >
                      — Clear selection —
                    </CommandItem>
                  )}
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.id}
                      onSelect={() => {
                        onValueChange?.(project.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === project.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <div className="font-medium">
                            {project.projectNumber ? `${project.projectNumber} - ${project.name}` : project.name}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const uniqueTabId = `project-edit-${project.id}-${Date.now()}`;
                          window.dispatchEvent(new CustomEvent('open-form-tab', {
                            detail: {
                              id: uniqueTabId,
                              name: project.name || 'Edit Project',
                              formType: 'project',
                              entityId: project.id,
                              parentId: parentId || testId
                            }
                          }));
                          setOpen(false);
                        }}
                        data-testid={`${testId}-edit-${project.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
