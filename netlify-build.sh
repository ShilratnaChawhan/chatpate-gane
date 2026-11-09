#!/bin/bash

echo "Cleaning music filenames for deployment..."

find src/assets/music -type f | while read -r file; do
    dir=$(dirname "$file")
    filename=$(basename "$file")

    newname=$(echo "$filename" | sed 's/[#?]/_/g')

    if [ "$filename" != "$newname" ]; then
        mv "$file" "$dir/$newname"
    fi
done

echo "Filename cleanup completed."

npm run build
