export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const inputFormData = await readFormData(event);
    const fileContent = inputFormData.get('file') as File;

    if (!fileContent) {
        throw createError({ statusCode: 400, statusMessage: 'File not provided' });
    }

    const formData = new FormData()
    formData.append('file', fileContent, fileContent.name);

    const response = await $fetch(`${config.public.apiUrl}/transcribe`, {
        method: 'POST',
        body: formData,
    });

    return response;
});