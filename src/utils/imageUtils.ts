export const getPlaceholderUrl = (title: string) => `https://picsum.photos/seed/${encodeURIComponent(title)}/500/750`;

export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
