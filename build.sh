#!/bin/bash

# Create public directory if it doesn't exist
mkdir -p public

# Copy all static files to public directory
cp index.html public/
cp styles.css public/
cp script.js public/
cp config.json public/
cp banks.json public/
cp giftCards.json public/
cp pendingApplications.json public/
cp _redirects public/

# Copy directories
cp -r registration public/
cp -r transfer public/
cp -r banks public/
cp -r admin public/
cp -r data public/

echo "Build complete: static files copied to public/"
