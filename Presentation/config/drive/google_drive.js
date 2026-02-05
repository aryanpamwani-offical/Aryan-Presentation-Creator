const uploadImageToDrive = async(auth, filePath)=> {
  try {
    if (!existsSync(filePath)) return null;
    const drive = google.drive({ version: 'v3', auth });
    const file = await drive.files.create({
      requestBody: { name: path.basename(filePath) },
      media: { mimeType: 'image/png', body: createReadStream(filePath) },
      fields: 'id',
    });
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { role: 'editor', type: 'anyone' },
    });
    const result = await drive.files.get({
      fileId: file.data.id,
      fields: 'webContentLink',
    });
    return result.data.webContentLink;
  } catch (err) {
    console.error('Drive Upload Error:', err.message);
    return null;
  }
}

export default uploadImageToDrive;