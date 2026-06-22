// Categories & Tags Management with Ant Design

import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import {
  Card,
  Tabs,
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Space,
  Typography,
  Empty,
  Spin,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  TagOutlined,
} from '@ant-design/icons';
import './style.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  count?: number;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
  count?: number;
  created_at: string;
  updated_at: string;
}

const CategoriesTagsManagement: React.FC = () => {
  // State for categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm] = Form.useForm();

  // State for tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm] = Form.useForm();

  // Active tab state
  const [activeTab, setActiveTab] = useState('categories');

  // Load data on component mount
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  // Categories functions
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await apiService.getPublicCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      message.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCategorySubmit = async (values: any) => {
    try {
      if (editingCategory) {
        const response = await apiService.updateCategory(editingCategory.id, values);
        if (response.success) {
          message.success('Category updated successfully');
          setCategoryModalOpen(false);
          setEditingCategory(null);
          categoryForm.resetFields();
          loadCategories();
        } else {
          message.error(response.message || 'Failed to update category');
        }
      } else {
        const response = await apiService.createCategory(values);
        if (response.success) {
          message.success('Category created successfully');
          setCategoryModalOpen(false);
          categoryForm.resetFields();
          loadCategories();
        } else {
          message.error(response.message || 'Failed to create category');
        }
      }
    } catch (error) {
      console.error('Category operation failed:', error);
      message.error('Operation failed');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await apiService.deleteCategory(categoryId);
      if (response.success) {
        message.success('Category deleted successfully');
        loadCategories();
      } else {
        message.error(response.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      message.error('Failed to delete category');
    }
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.setFieldsValue({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'folder',
      });
    } else {
      setEditingCategory(null);
      categoryForm.resetFields();
      categoryForm.setFieldsValue({ icon: 'folder' });
    }
    setCategoryModalOpen(true);
  };

  // Tags functions
  const loadTags = async () => {
    setTagsLoading(true);
    try {
      const response = await apiService.getPublicTags();
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
      message.error('Failed to load tags');
    } finally {
      setTagsLoading(false);
    }
  };

  const handleTagSubmit = async (values: any) => {
    try {
      if (editingTag) {
        const response = await apiService.updateTag(editingTag.id, values);
        if (response.success) {
          message.success('Tag updated successfully');
          setTagModalOpen(false);
          setEditingTag(null);
          tagForm.resetFields();
          loadTags();
        } else {
          message.error(response.message || 'Failed to update tag');
        }
      } else {
        const response = await apiService.createTag(values);
        if (response.success) {
          message.success('Tag created successfully');
          setTagModalOpen(false);
          tagForm.resetFields();
          loadTags();
        } else {
          message.error(response.message || 'Failed to create tag');
        }
      }
    } catch (error) {
      console.error('Tag operation failed:', error);
      message.error('Operation failed');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const response = await apiService.deleteTag(tagId);
      if (response.success) {
        message.success('Tag deleted successfully');
        loadTags();
      } else {
        message.error(response.message || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      message.error('Failed to delete tag');
    }
  };

  const openTagModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      tagForm.setFieldsValue({ name: tag.name });
    } else {
      setEditingTag(null);
      tagForm.resetFields();
    }
    setTagModalOpen(true);
  };

  // Render category card
  const renderCategoryCard = (category: Category) => (
    <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
      <Card
        hoverable
        className="item-card"
        actions={[
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openCategoryModal(category)}
          />,
          <Popconfirm
            key="delete"
            title="Delete Category"
            description="Are you sure you want to delete this category?"
            onConfirm={() => handleDeleteCategory(category.id)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ]}
      >
        <Card.Meta
          avatar={
            <div className="item-icon category-icon">
              <FolderOutlined />
            </div>
          }
          title={category.name}
          description={
            <Paragraph ellipsis={{ rows: 2 }} type="secondary">
              {category.description || 'No description'}
            </Paragraph>
          }
        />
      </Card>
    </Col>
  );

  // Render tag card
  const renderTagCard = (tag: Tag) => (
    <Col xs={24} sm={12} md={8} lg={6} key={tag.id}>
      <Card
        hoverable
        className="item-card"
        actions={[
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={() => openTagModal(tag)}
          />,
          <Popconfirm
            key="delete"
            title="Delete Tag"
            description="Are you sure you want to delete this tag?"
            onConfirm={() => handleDeleteTag(tag.id)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ]}
      >
        <Card.Meta
          avatar={
            <div className="item-icon tag-icon">
              <TagOutlined />
            </div>
          }
          title={tag.name}
        />
      </Card>
    </Col>
  );

  const tabItems = [
    {
      key: 'categories',
      label: (
        <span>
          <FolderOutlined />
          Categories
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="content-header">
            <Title level={4}>Categories</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openCategoryModal()}
            >
              Add Category
            </Button>
          </div>

          {categoriesLoading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text type="secondary">Loading categories...</Text>
            </div>
          ) : categories.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No categories yet"
            >
              <Button type="primary" onClick={() => openCategoryModal()}>
                Create Category
              </Button>
            </Empty>
          ) : (
            <Row gutter={[16, 16]}>
              {categories.map(renderCategoryCard)}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'tags',
      label: (
        <span>
          <TagOutlined />
          Tags
        </span>
      ),
      children: (
        <div className="tab-content">
          <div className="content-header">
            <Title level={4}>Tags</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openTagModal()}
            >
              Add Tag
            </Button>
          </div>

          {tagsLoading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text type="secondary">Loading tags...</Text>
            </div>
          ) : tags.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No tags yet"
            >
              <Button type="primary" onClick={() => openTagModal()}>
                Create Tag
              </Button>
            </Empty>
          ) : (
            <Row gutter={[16, 16]}>
              {tags.map(renderTagCard)}
            </Row>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Categories & Tags">
      <Card className="admin-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={categoryModalOpen}
        onCancel={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
          initialValues={{ icon: 'folder' }}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Enter description (optional)" />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Icon"
            extra="Material Design icon name (e.g., folder, category, label)"
          >
            <Input placeholder="Enter icon name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Tag Modal */}
      <Modal
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
        open={tagModalOpen}
        onCancel={() => {
          setTagModalOpen(false);
          setEditingTag(null);
          tagForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical" onFinish={handleTagSubmit}>
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[{ required: true, message: 'Please enter tag name' }]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setTagModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingTag ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
};

export default CategoriesTagsManagement;
