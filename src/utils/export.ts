import { jsPDF } from 'jspdf';
import { JournalEntry } from '../types';

export function exportJournalAsTxt(journal: JournalEntry) {
  let content = `Title: ${journal.title}\n`;
  content += `Date: ${new Date(journal.createdAt).toLocaleString()}\n`;
  if (journal.mood) content += `Mood: ${journal.mood}\n`;
  if (journal.tags?.length) content += `Tags: ${journal.tags.join(', ')}\n`;
  content += `\n========================================\n\n`;
  content += `${journal.content}\n\n`;

  if (journal.summary) {
    content += `\n--- AI Summary ---\n${journal.summary}\n`;
  }
  if (journal.reflection) {
    content += `\n--- AI Reflection ---\n${journal.reflection}\n`;
  }
  if (journal.keyPoints?.length) {
    content += `\n--- Key Takeaways ---\n${journal.keyPoints.map(p => `• ${p}`).join('\n')}\n`;
  }
  if (journal.questions?.length) {
    content += `\n--- Reflection Questions ---\n${journal.questions.map(q => `? ${q}`).join('\n')}\n`;
  }
  if (journal.messages?.length) {
    content += `\n--- Gemini Dialogue History ---\n`;
    journal.messages.forEach(m => {
      content += `[${m.role.toUpperCase()}] ${new Date(m.createdAt).toLocaleTimeString()}:\n${m.content}\n\n`;
    });
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(journal.title || 'journal')}-${new Date(journal.createdAt).toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJournalAsMarkdown(journal: JournalEntry) {
  let md = `# ${journal.title}\n\n`;
  md += `*Created: ${new Date(journal.createdAt).toLocaleString()}*\n\n`;
  if (journal.mood) md += `**Mood:** \`${journal.mood}\`  \n`;
  if (journal.tags?.length) md += `**Tags:** ${journal.tags.map(t => `#${t}`).join(' ')}  \n\n`;
  md += `## Journal Entry\n\n${journal.content}\n\n`;

  if (journal.summary) {
    md += `### ✨ AI Summary\n\n${journal.summary}\n\n`;
  }
  if (journal.reflection) {
    md += `### 💡 AI Reflection\n\n${journal.reflection}\n\n`;
  }
  if (journal.keyPoints?.length) {
    md += `### 📌 Key Takeaways\n\n${journal.keyPoints.map(p => `- ${p}`).join('\n')}\n\n`;
  }
  if (journal.questions?.length) {
    md += `### ❓ Questions to Consider\n\n${journal.questions.map(q => `- ${q}`).join('\n')}\n\n`;
  }
  if (journal.messages?.length) {
    md += `### 💬 Gemini Dialogue\n\n`;
    journal.messages.forEach(m => {
      md += `**${m.role === 'user' ? '👤 You' : '🤖 Gemini'}** (${new Date(m.createdAt).toLocaleTimeString()}):\n>${m.content.replace(/\n/g, '\n> ')}\n\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(journal.title || 'journal')}-${new Date(journal.createdAt).toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJournalAsJson(journal: JournalEntry) {
  const dataStr = JSON.stringify(journal, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(journal.title || 'journal')}-${new Date(journal.createdAt).toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJournalAsPdf(journal: JournalEntry) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - margin * 2;
  let y = 50;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(journal.title || 'Untitled Journal Entry', margin, y);
  y += 24;

  // Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateStr = `Date: ${new Date(journal.createdAt).toLocaleString()} | Tags: ${journal.tags?.join(', ') || 'None'} | Mood: ${journal.mood || 'Not specified'}`;
  doc.text(dateStr, margin, y);
  y += 20;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Body content
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(journal.content || '(No content written)', maxLineWidth);
  
  splitText.forEach((line: string) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.text(line, margin, y);
    y += 16;
  });

  y += 20;

  // Summary if exists
  if (journal.summary) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(50, 80, 160);
    doc.text('AI Summary', margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const splitSummary = doc.splitTextToSize(journal.summary, maxLineWidth);
    splitSummary.forEach((line: string) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, margin, y);
      y += 15;
    });
    y += 15;
  }

  doc.save(`${sanitizeFilename(journal.title || 'journal')}-${new Date(journal.createdAt).toISOString().split('T')[0]}.pdf`);
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 40);
}
