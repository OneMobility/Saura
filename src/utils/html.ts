export const stripHtmlTags = (html: string | null | undefined): string => {
  if (!html) return '';
  // Crea un elemento temporal para parsear el HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Devuelve el texto contenido, eliminando todas las etiquetas
  return doc.body.textContent || '';
};