import { removeBackground, loadImage } from './removeBackground';
import logoSrc from '@/assets/pricing-engine-logo.png';

export async function processLogoBackground(): Promise<string> {
  try {
    // Fetch the logo image
    const response = await fetch(logoSrc);
    const blob = await response.blob();
    
    // Load as HTMLImageElement
    const imageElement = await loadImage(blob);
    
    // Remove background
    const processedBlob = await removeBackground(imageElement);
    
    // Create object URL for the processed image
    return URL.createObjectURL(processedBlob);
  } catch (error) {
    console.error('Error processing logo:', error);
    // Return original logo if processing fails
    return logoSrc;
  }
}
