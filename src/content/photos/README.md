# Photo Gallery

This directory contains photo metadata for the gallery page.

## Adding Photos

Create a JSON file for each photo with the following structure:

```json
{
  "title": "Photo Title",
  "description": "A brief description of the photo",
  "date": "2024-01-15T00:00:00.000Z",
  "image": "/path/to/full-resolution-image.jpg",
  "thumbnail": "/path/to/thumbnail.jpg",
  "tags": ["nature", "landscape", "sunset"],
  "location": "Location Name"
}
```

## Fields

- **title** (required): The title of the photo
- **description** (optional): A brief description
- **date** (required): ISO 8601 date string when the photo was taken
- **image** (required): Path or URL to the full-resolution image
- **thumbnail** (optional): Path or URL to a smaller thumbnail (defaults to image if not provided)
- **tags** (optional): Array of tags for categorization
- **location** (optional): Location where the photo was taken

## Image Paths

Images can be:
- **Local files**: Place images in `/public/gallery/` and reference as `/gallery/image.jpg`
- **External URLs**: Use full URLs like `https://example.com/image.jpg`
- **CDN URLs**: Configure allowed domains in `astro.config.ts`

## File Naming

Use descriptive names for JSON files like:
- `sunset-beach-2024.json`
- `mountain-peak-spring.json`
- `city-night-lights.json`

The filename doesn't affect the gallery display - only the content matters.

## Display Order

Photos are automatically sorted by date (newest first) on the gallery page.
