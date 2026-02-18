import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
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
      <div className="flex-1 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between", className)}
              data-testid={testId}
            >
              {selectedProject 
                ? (selectedProject.projectNumber 
                    ? `${selectedProject.projectNumber} - ${selectedProject.name}` 
                    : selectedProject.name)
                : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                const project = projects.find(p => p.name === value);
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
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
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
                        <Search className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {value && selectedProject && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          onClick={() => {
            const uniqueTabId = `project-edit-${selectedProject.id}-${Date.now()}`;
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: {
                id: uniqueTabId,
                name: selectedProject.name || 'Edit Project',
                formType: 'project',
                entityId: selectedProject.id,
                parentId: parentId || testId
              }
            }));
          }}
          data-testid={`${testId}-lookup`}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
