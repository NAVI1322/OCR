import ReactQuill from 'react-quill';

export function TextArea()
{


    return  <ReactQuill
    theme="snow"
    placeholder="Write your story and share with the world"
    className="md:h-80 h-20 mb-12 dark:bg-gray-300 "
    value={content}
    onChange={handleChange}
  />
}