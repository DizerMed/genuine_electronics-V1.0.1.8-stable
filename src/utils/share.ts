export const shareProduct = async (product: { name: string; description?: string; id: string; image?: string }) => {
  const url = `${window.location.origin}/product/${product.id}`;
  const cleanDescription = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const shareData: ShareData = {
    title: product.name,
    text: cleanDescription || product.name,
    url: url,
  };

  if (product.image) {
    try {
      const response = await fetch(product.image);
      const blob = await response.blob();
      const file = new File([blob], 'product-image.jpg', { type: blob.type });
      shareData.files = [file];
    } catch (err) {
      // Image fetching often fails due to CORS, which is acceptable.
      // Continue sharing without the image attachment.
    }
  }

  if (navigator.share) {
    try {
      // Check if canShare is supported for the file
      if (shareData.files && navigator.canShare && !navigator.canShare(shareData)) {
        // Fallback if files can't be shared
        delete shareData.files;
      }
      await navigator.share(shareData);
    } catch (err: any) {
      if (err.name !== 'AbortError' && !err.message?.includes('Share canceled')) {
        console.error('Error sharing:', err);
      }
    }
  } else {
    // Fallback
    navigator.clipboard.writeText(`${product.name}\n${cleanDescription}\n${url}`);
    alert('Link copied to clipboard!');
  }
};
