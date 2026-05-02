import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    
    // Si no existen configuraciones iniciales, creamos una por defecto
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          coupleNames: 'Nuestros Nombres',
          bankName: 'Banco',
          bankAccount: '000000',
          bankHolder: 'Titular',
          bankDocument: '0.000.000',
          bankAlias: '',
          galleryImages: '[]',
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Only allow updating certain fields
    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        coupleNames: body.coupleNames ?? settings.coupleNames,
        coverPhotoUrl: body.coverPhotoUrl ?? settings.coverPhotoUrl,
        avatarPhotoUrl: body.avatarPhotoUrl ?? settings.avatarPhotoUrl,
        bankName: body.bankName ?? settings.bankName,
        bankAccount: body.bankAccount ?? settings.bankAccount,
        bankHolder: body.bankHolder ?? settings.bankHolder,
        bankDocument: body.bankDocument ?? settings.bankDocument,
        bankAlias: body.bankAlias ?? settings.bankAlias,
        galleryImages: body.galleryImages !== undefined 
          ? (typeof body.galleryImages === 'string' ? body.galleryImages : JSON.stringify(body.galleryImages)) 
          : settings.galleryImages,
        weddingDate: body.weddingDate !== undefined ? body.weddingDate : settings.weddingDate,
      }
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
