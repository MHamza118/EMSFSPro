// Storage service for Firestore-only implementation (no Firebase Storage)
class StorageService {
  // Convert file to Base64 for Firestore storage
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Process file for Firestore storage
  async processFile(file) {
    try {
      // Convert file to Base64
      const base64Data = await this.fileToBase64(file);

      return {
        success: true,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: base64Data, // Base64 encoded file data
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  // Create download link from Base64 data
  createDownloadLink(fileName, base64Data) {
    try {
      console.log('Creating download link for:', fileName);
      console.log('Base64 data length:', base64Data?.length);

      if (!base64Data || !fileName) {
        throw new Error('Missing file data or filename');
      }

      // Extract the base64 part (remove data:type;base64, prefix)
      const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      // Create a blob from base64 data
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Determine MIME type from base64 data or file extension
      let mimeType = 'application/octet-stream';
      if (base64Data.startsWith('data:')) {
        mimeType = base64Data.substring(5, base64Data.indexOf(';'));
      } else {
        // Fallback: determine from file extension
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'txt': 'text/plain',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png'
        };
        mimeType = mimeTypes[ext] || 'application/octet-stream';
      }

      const blob = new Blob([byteArray], { type: mimeType });

      // Create download URL
      const url = URL.createObjectURL(blob);

      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log('Download initiated successfully for:', fileName);
      return { success: true };
    } catch (error) {
      console.error('Error creating download link:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  // Generate file path for progress reports
  generateProgressReportPath(userId, fileName) {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `progress-reports/${userId}/${timestamp}_${sanitizedFileName}`;
  }

  // Generate file path for other uploads
  generateFilePath(category, userId, fileName) {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${category}/${userId}/${timestamp}_${sanitizedFileName}`;
  }

  // Get file extension
  getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  // Validate file type
  isValidFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) {
      // Default allowed types for progress reports
      allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
    }

    const extension = this.getFileExtension(file.name);
    return allowedTypes.includes(extension);
  }

  // Validate file size (in MB)
  isValidFileSize(file, maxSizeMB = 10) {
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB <= maxSizeMB;
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const storageService = new StorageService();
export default storageService;
