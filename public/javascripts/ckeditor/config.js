/* global CKEDITOR */
CKEDITOR.editorConfig = function( config ) {
  config.toolbar = [
    { name: 'basicstyles', items: [ 'Bold', 'Italic', '-', 'RemoveFormat' ] },
    { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
    { name: 'paragraph', items: [ 'NumberedList', 'BulletedList' ] },
    { name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
    { name: 'document', items: [ 'Source' ] },
    { name: 'about', items: [ 'About' ] }
  ];
};
