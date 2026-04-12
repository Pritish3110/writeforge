import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import { readStoredJsonValue, writeStoredJsonValue } from "@/lib/backend/storageAdapter";

interface KBSection {
  id: string;
  title: string;
  items: string[];
}

const DEFAULT_SECTIONS: KBSection[] = [];

const STORAGE_KEY = "writeforge-knowledge-base";

const readStoredSections = (): KBSection[] => {
  const parsed = readStoredJsonValue<KBSection[]>(STORAGE_KEY, DEFAULT_SECTIONS);
  return Array.isArray(parsed) ? parsed : DEFAULT_SECTIONS;
};

const KnowledgeBase = () => {
  const confirmDelete = useDeleteConfirmation();
  const [sections, setSections] = useState<KBSection[]>(() => readStoredSections());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editItems, setEditItems] = useState("");
  const [openSections, setOpenSections] = useState<string[]>([]);

  useEffect(() => {
    writeStoredJsonValue(STORAGE_KEY, sections);
  }, [sections]);

  const startEdit = (section: KBSection) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditItems(section.items.join("\n"));
    setOpenSections((prev) => (prev.includes(section.id) ? prev : [...prev, section.id]));
  };

  const saveEdit = () => {
    if (!editingId) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, title: editTitle, items: editItems.split("\n").filter((l) => l.trim()) }
          : s
      )
    );
    setEditingId(null);
  };

  const addSection = () => {
    const newSection: KBSection = {
      id: `section-${Date.now()}`,
      title: "New Section",
      items: ["Add your notes here"],
    };
    setSections((prev) => [...prev, newSection]);
    startEdit(newSection);
  };

  const deleteSection = async (id: string) => {
    const target = sections.find((section) => section.id === id);
    if (!target) return;

    const shouldDelete = await confirmDelete({
      title: `Delete "${target.title}"?`,
      description: "This knowledge-base section and all of its notes will be removed. This action cannot be undone.",
      confirmLabel: "Delete Section",
    });
    if (!shouldDelete) return;

    setSections((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
    setOpenSections((prev) => prev.filter((sectionId) => sectionId !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Your personal writing wiki. Edit any card to customize.
        </p>
      </div>

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3">
        {sections.map((section) => {
          const isEditing = editingId === section.id;
          return (
            <AccordionItem key={section.id} value={section.id} className="border-none">
              <Card className="glow-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger className="py-0 hover:no-underline flex-1 justify-start gap-2">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1 ml-2">
                      {isEditing ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                          <Check className="h-3.5 w-3.5 text-neon-cyan" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(section)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => void deleteSection(section.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="pt-0 pb-4 px-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="font-mono text-sm"
                          placeholder="Section title"
                        />
                        <Textarea
                          value={editItems}
                          onChange={(e) => setEditItems(e.target.value)}
                          className="font-mono text-sm min-h-[120px]"
                          placeholder="One rule per line"
                        />
                      </div>
                    ) : (
                      <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                        {section.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button onClick={addSection} variant="outline" className="w-full font-mono border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Add New Section
      </Button>
    </div>
  );
};

export default KnowledgeBase;
