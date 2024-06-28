import { useState, useEffect } from 'react';
import { isPlatform } from '@ionic/react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
const PHOTO_STORAGE = 'photos';
const changeImgToBase64 = async (imgPath: string) => {
  const base64Data = await fetch(imgPath).then(res => res.blob()).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  }));
  return base64Data;
}

export async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject('method did not return a string');
      }
    };
    reader.readAsDataURL(blob);
  });
}
export interface UserPhoto {
    filepath: string;
    webviewPath?: string;
    base64Data?:any
  }
  export function usePhotoGallery() {
    
    const [photos, setPhotos] = useState<UserPhoto[]>([]);
    const savePicture = async (photo: Photo, fileName: string): Promise<UserPhoto> => {
      const base64Data = await base64FromPath(photo.webPath!);
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });

      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
        base64Data: base64Data
      };
    };
    const takePhoto = async () => {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 100,
      });
      const fileName = Date.now() + '.jpeg';
      const savedFileImage = await savePicture(photo, fileName);
      // let base64 = await changeImgToBase64(`${photo.webPath}`)||'';
      const newPhotos = [
      savedFileImage,
      ...photos
      ];
      setPhotos(newPhotos);
      Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });
    };
    useEffect(() => {
      const loadSaved = async () => {
        const { value } = await Preferences.get({ key: PHOTO_STORAGE });
        const photosInPreferences = (value ? JSON.parse(value) : []) as UserPhoto[];
    
        for (let photo of photosInPreferences) {
          const file = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data,
          });
          // Web platform only: Load the photo as base64 data
          photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
        setPhotos(photosInPreferences);
      };
      loadSaved();
    }, []);
  
    return {
        photos,
        takePhoto,
    };
}

