import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Checkbox,
  Space,
  Input,
  Collapse,
  App,
  Form,
  Result,
} from "antd";
import {
  CaretRightOutlined,
  CaretDownOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import AppLayout from "../components/layout/AppLayout";
import formService from "../services/formService";
import { isApiSuccess, getApiData } from "../utils/apiUtils";
import "../styles/FormConfig.css";

const { Title } = Typography;
const { TextArea } = Input;

const FormConfigPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useSelector((state) => state.auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [fields, setFields] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [configChanges, setConfigChanges] = useState({});

  const getRandomFieldsExample = (currentRecord) => {
    // Lấy các field khác currentRecord để làm ví dụ
    const otherFields = fields.filter(
      (field) =>
        field.formFieldId !== currentRecord.formFieldId &&
        field.fieldType !== "Formula" // Loại bỏ Formula fields
    );

    if (otherFields.length === 0) {
      return "TraineeName, TraineeID";
    }

    // Random 2-3 fields để làm ví dụ
    const shuffled = otherFields.sort(() => 0.5 - Math.random());
    const selectedFields = shuffled.slice(0, Math.min(3, otherFields.length));

    return selectedFields.map((field) => field.fieldName).join(", ");
  };

  // Thêm hàm helper để kiểm tra formula pattern
  const isTemplatePattern = (formula) => {
    return formula && formula.match(/^\{[a-zA-Z]_[a-zA-Z]+\}$/);
  };

  // Thêm hàm helper để lấy initial value cho formula
  const getInitialFormulaValue = (field) => {
    if (!field.formula) return "";
    if (isTemplatePattern(field.formula)) return "";
    return field.formula;
  };

  const fetchFormConfig = async () => {
    try {
      setLoading(true);
      const response = await formService.getFormFields(formId);
      if (response.statusCode === 200) {
        setFormData(response.data);
        setFields(response.data.fields);

        // Set initial form values
        const initialValues = {};
        response.data.fields.forEach((field) => {
          // Hiển thị formula hiện tại cho người dùng chỉnh sửa nếu không phải template pattern
          initialValues[`formula_${field.formFieldId}`] = getInitialFormulaValue(field);
          initialValues[`options_${field.formFieldId}`] = 
            field.fieldType === "Select" ? getInitialFormulaValue(field) : "";
          initialValues[`dependentVariables_${field.formFieldId}`] = 
            field.fieldType === "Boolean" ? getInitialFormulaValue(field) : "";
          initialValues[`isRequired_${field.formFieldId}`] = field.isRequired;
          initialValues[`isUpperCase_${field.formFieldId}`] = field.isUpperCase || false;
        });
        form.setFieldsValue(initialValues);
      } else {
        message.error("Không thể tải thông tin cấu hình form");
      }
    } catch (error) {
      console.error("Error fetching form config:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Đã có lỗi xảy ra khi tải thông tin cấu hình form");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formId) {
      fetchFormConfig();
    }
  }, [formId]);

  const getFieldTypeTag = (type) => {
    switch (type) {
      case "Text":
      case "Textarea":
        return <Tag color="blue">Văn bản</Tag>;
      case "Number":
        return <Tag color="success">Số</Tag>;
      case "Date":
        return <Tag color="warning">Ngày tháng</Tag>;
      case "Boolean":
        return <Tag color="purple">Đúng/Sai</Tag>;
      case "Formula":
        return <Tag color="orange">Công thức</Tag>;
      case "Select":
        return <Tag color="cyan">Lựa chọn</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const handleSaveFormula = async (record) => {
    try {
      const formula = form.getFieldValue(`formula_${record.formFieldId}`);
      if (!formula || formula.trim() === "") {
        message.warning("Vui lòng nhập công thức");
        return;
      }

      console.log("Saving formula:", {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        formula: formula,
      });

      const response = await formService.updateFormula(formId, record.fieldId, {
        formula: formula.trim(),
        description: "",
      });

      if (response.statusCode === 200) {
        message.success("Cập nhật công thức thành công");
        console.log("Formula updated successfully:", response);

        // Cập nhật lại data trong state
        setFields((prevFields) =>
          prevFields.map((field) =>
            field.formFieldId === record.formFieldId
              ? { ...field, formula: formula.trim() }
              : field
          )
        );

        // Refresh form data
        fetchFormConfig();
      }
    } catch (error) {
      console.error("Error updating formula:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Đã có lỗi xảy ra khi cập nhật công thức");
      }
    }
  };

  const handleSaveBooleanConfig = async (record) => {
    try {
      const depVars = form.getFieldValue(
        `dependentVariables_${record.formFieldId}`
      );
      const isRequired = form.getFieldValue(`isRequired_${record.formFieldId}`);

      console.log("Saving Boolean field config:", {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        dependentVariables: depVars,
        isRequired: isRequired,
        originalRequired: record.isRequired,
      });

      // 1. Cập nhật formula nếu có dependent variables
      if (depVars && depVars.trim() !== "") {
        // Truyền formula đúng như user nhập, không tự động format
        const formula = depVars.trim();

        console.log("Updating boolean formula (raw input):", formula);
        const formulaResponse = await formService.updateBooleanFormula(
          formId,
          record.fieldId,
          {
            formula: formula,
          }
        );
        if (formulaResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật biến phụ thuộc");
          return;
        }
        console.log("Boolean formula updated successfully:", formulaResponse);
      }

      // 2. Cập nhật isRequired nếu có thay đổi
      if (isRequired !== record.isRequired) {
        console.log("Toggling required status...");
        const requiredResponse = await formService.toggleRequired(
          formId,
          record.fieldId
        );
        if (requiredResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật trạng thái bắt buộc nhập");
          return;
        }
        console.log("Required status toggled successfully:", requiredResponse);
      }

      message.success("Cập nhật cấu hình Boolean field thành công");

      // Cập nhật lại data trong state
      setFields((prevFields) =>
        prevFields.map((field) =>
          field.formFieldId === record.formFieldId
            ? {
                ...field,
                dependentVariables: depVars?.trim() || "",
                isRequired: isRequired,
                formula:
                  depVars && depVars.trim() !== ""
                    ? depVars.trim() // Lưu đúng như user nhập
                    : field.formula,
              }
            : field
        )
      );
    } catch (error) {
      console.error("Error updating Boolean field config:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Đã có lỗi xảy ra khi cập nhật cấu hình Boolean field");
      }
    }
  };

  const handleSaveConfig = async (record) => {
    console.log("=== handleSaveConfig called ===", record);
    try {
      console.log("Saving config for field:", record);

      // Lấy giá trị config hiện tại từ form
      const isRequired = form.getFieldValue(`isRequired_${record.formFieldId}`);
      const isUpperCase = form.getFieldValue(
        `isUpperCase_${record.formFieldId}`
      );
      const options = form.getFieldValue(`options_${record.formFieldId}`);
      const formula = form.getFieldValue(`formula_${record.formFieldId}`);

      console.log("Current values:", { isRequired, isUpperCase, options, formula });
      console.log("Original values:", {
        originalRequired: record.isRequired,
        originalUpperCase: record.isUpperCase,
        originalFormula: record.formula,
      });

      // Kiểm tra nếu không có thay đổi nào
      if (
        isRequired === record.isRequired &&
        ((record.fieldType !== "Text" && record.fieldType !== "Textarea") ||
          isUpperCase === record.isUpperCase) &&
        (record.fieldType !== "Select" || !options || options.trim() === record.formula) &&
        (record.fieldType !== "Formula" || !formula || formula.trim() === record.formula)
      ) {
        message.info("Không có thay đổi nào để lưu");
        return;
      }

      // Gọi API toggle-required nếu giá trị isRequired thay đổi
      if (isRequired !== record.isRequired) {
        console.log("Toggling required status...");
        const requiredResponse = await formService.toggleRequired(
          formId,
          record.fieldId
        );
        if (requiredResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật trạng thái bắt buộc nhập");
          return;
        }
        console.log("Required status toggled successfully:", requiredResponse);
      }

      // Gọi API toggle-uppercase nếu giá trị isUpperCase thay đổi và field hỗ trợ uppercase
      if (
        (record.fieldType === "Text" || record.fieldType === "Textarea") &&
        isUpperCase !== record.isUpperCase
      ) {
        console.log("Toggling uppercase status...");
        const uppercaseResponse = await formService.toggleUppercase(
          formId,
          record.fieldId
        );
        if (uppercaseResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật trạng thái bắt buộc nhập chữ hoa");
          return;
        }
        console.log(
          "Uppercase status toggled successfully:",
          uppercaseResponse
        );
      }

      // Gọi API updateSelectOptions nếu là field Select và có thay đổi options
      if (record.fieldType === "Select" && options && options.trim() !== record.formula) {
        console.log("Updating select options...");
        if (!options) {
          message.warning("Vui lòng nhập các lựa chọn");
          return;
        }
        console.log("options", options);

        const selectResponse = await formService.updateSelectOptions(
          formId,
          record.fieldId,
          {
            options
          }
        );
        if (selectResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật danh sách lựa chọn");
          return;
        }
        console.log("Select options updated successfully:", selectResponse);
      }

      // Gọi API updateFormula nếu là field Formula và có thay đổi formula
      if (record.fieldType === "Formula" && formula && formula.trim() !== record.formula) {
        console.log("Updating formula...");
        if (!formula) {
          message.warning("Vui lòng nhập công thức");
          return;
        }
        console.log("formula", formula);

        const formulaResponse = await formService.updateFormula(
          formId,
          record.fieldId,
          {
            formula: formula.trim(),
            description: ""
          }
        );
        if (formulaResponse.statusCode !== 200) {
          message.error("Lỗi khi cập nhật công thức");
          return;
        }
        console.log("Formula updated successfully:", formulaResponse);
      }

      message.success("Cập nhật cấu hình thành công");

      // Cập nhật lại data trong state
      setFields((prevFields) =>
        prevFields.map((field) =>
          field.formFieldId === record.formFieldId
            ? {
                ...field,
                isRequired: isRequired,
                isUpperCase: isUpperCase,
                formula: record.fieldType === "Select" && options ? 
                  options.split('\n')
                    .map(opt => opt.trim())
                    .filter(opt => opt)
                    .map(opt => `"${opt}"`)
                    .join(',')
                  : record.fieldType === "Formula" && formula ?
                    formula.trim()
                    : field.formula,
                options: record.fieldType === "Select" && options ? 
                  options.split('\n')
                    .map(opt => opt.trim())
                    .filter(opt => opt)
                    .map(opt => `"${opt}"`)
                    .join(',')
                  : field.options
              }
            : field
        )
      );

      // Clear config changes cho field này
      setConfigChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[record.formFieldId];
        return newChanges;
      });
      
      // Refresh form data để đảm bảo đồng bộ
      await fetchFormConfig();
    } catch (error) {
      console.error("Error saving config:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Đã có lỗi xảy ra khi lưu cấu hình");
      }
    }
  };

  const handleSaveAllConfigs = async () => {
    try {
      setLoading(true);
      let hasChanges = false;

      // Lưu lần lượt cấu hình cho từng field
      for (const field of fields) {
        const isRequired = form.getFieldValue(`isRequired_${field.formFieldId}`);
        const isUpperCase = form.getFieldValue(`isUpperCase_${field.formFieldId}`);
        const formula = form.getFieldValue(`formula_${field.formFieldId}`);
        const options = form.getFieldValue(`options_${field.formFieldId}`);
        const depVars = form.getFieldValue(`dependentVariables_${field.formFieldId}`);

        // Kiểm tra có thay đổi nào không
        const hasRequiredChange = isRequired !== field.isRequired;
        const hasUpperCaseChange = (field.fieldType === "Text" || field.fieldType === "Textarea") && isUpperCase !== field.isUpperCase;
        const hasFormulaChange = field.fieldType === "Formula" && formula && formula.trim() !== field.formula;
        const hasOptionsChange = field.fieldType === "Select" && options && options.trim() !== field.formula;
        const hasBooleanChange = field.fieldType === "Boolean" && depVars && depVars.trim() !== field.formula;

        if (hasRequiredChange || hasUpperCaseChange || hasFormulaChange || hasOptionsChange || hasBooleanChange) {
          hasChanges = true;

          // Cập nhật isRequired nếu có thay đổi
          if (hasRequiredChange) {
            const requiredResponse = await formService.toggleRequired(formId, field.fieldId);
            if (requiredResponse.statusCode !== 200) {
              throw new Error(`Lỗi khi cập nhật trạng thái bắt buộc nhập cho trường ${field.fieldName}`);
            }
          }

          // Cập nhật isUpperCase nếu có thay đổi
          if (hasUpperCaseChange) {
            const uppercaseResponse = await formService.toggleUppercase(formId, field.fieldId);
            if (uppercaseResponse.statusCode !== 200) {
              throw new Error(`Lỗi khi cập nhật trạng thái chữ hoa cho trường ${field.fieldName}`);
            }
          }

          // Cập nhật formula cho Formula fields
          if (hasFormulaChange) {
            const formulaResponse = await formService.updateFormula(formId, field.fieldId, {
              formula: formula.trim(),
              description: "",
            });
            if (formulaResponse.statusCode !== 200) {
              throw new Error(`Lỗi khi cập nhật công thức cho trường ${field.fieldName}`);
            }
          }

          // Cập nhật options cho Select fields
          if (hasOptionsChange) {
            const selectResponse = await formService.updateSelectOptions(formId, field.fieldId, {
              options
            });
            if (selectResponse.statusCode !== 200) {
              throw new Error(`Lỗi khi cập nhật danh sách lựa chọn cho trường ${field.fieldName}`);
            }
          }

          // Cập nhật formula cho Boolean fields
          if (hasBooleanChange) {
            const booleanResponse = await formService.updateBooleanFormula(formId, field.fieldId, {
              formula: depVars.trim(),
            });
            if (booleanResponse.statusCode !== 200) {
              throw new Error(`Lỗi khi cập nhật biến phụ thuộc cho trường ${field.fieldName}`);
            }
          }
        }
      }

      if (!hasChanges) {
        message.info("Không có thay đổi nào để lưu");
        return;
      }

      message.success("Đã lưu tất cả cấu hình thành công");
      
      // Clear tất cả config changes
      setConfigChanges({});
      
      // Refresh form data
      await fetchFormConfig();
    } catch (error) {
      console.error("Error saving all configs:", error);
      message.error(error.message || "Đã có lỗi xảy ra khi lưu tất cả cấu hình");
    } finally {
      setLoading(false);
    }
  };

  //Css để có animation smooth
  const expandableRowStyle = {
    ".ant-table-expanded-row > td": {
      padding: "0 !important",
    },
    ".ant-table-expanded-row .ant-table-expanded-row-cell": {
      padding: "0 !important",
    },
  };

  const expandedRowRender = (record) => {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
            height: { duration: 0.4 },
          }}
          style={{ overflow: "hidden" }}
        >
          <div
            style={{
              padding: "16px 24px",
              backgroundColor: "#fafafa",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {(record.fieldType === "Text" ||
                record.fieldType === "Textarea") && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Form.Item
                    name={`isUpperCase_${record.formFieldId}`}
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox>Bắt buộc nhập chữ hoa</Checkbox>
                  </Form.Item>
                </motion.div>
              )}

              {record.fieldType === "Boolean" && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: "100%" }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        fontWeight: "500",
                        marginBottom: "4px",
                        display: "block",
                      }}
                    >
                      Danh sách biến phụ thuộc:
                    </label>
                    <div
                      style={{
                        backgroundColor: "#f0f9ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "4px",
                        padding: "8px",
                        marginBottom: "8px",
                        fontSize: "12px",
                        color: "#1e40af",
                      }}
                    >
                      Ví dụ: {getRandomFieldsExample(record)}
                    </div>
                    <Form.Item
                      name={`dependentVariables_${record.formFieldId}`}
                      style={{ marginBottom: "8px" }}
                    >
                      <Input
                        placeholder={`Ví dụ: ${getRandomFieldsExample(record)}`}
                      />
                    </Form.Item>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "12px",
                        lineHeight: "1.4",
                      }}
                    >
                      {isTemplatePattern(record.formula) ? (
                        "Nhập danh sách tên biến bị ảnh hưởng khi checkbox này được chọn."
                      ) : (
                        "Giá trị hiện tại sẽ được hiển thị trong input. Bạn có thể chỉnh sửa nếu cần."
                      )}
                    </div>

                    {/* Checkbox bắt buộc nhập cho Boolean field */}
                    <Form.Item
                      name={`isRequired_${record.formFieldId}`}
                      valuePropName="checked"
                      style={{ marginBottom: "12px" }}
                    >
                      <Checkbox>Bắt buộc nhập</Checkbox>
                    </Form.Item>

                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleSaveBooleanConfig(record)}
                      style={{
                        height: "28px",
                        fontSize: "12px",
                        padding: "4px 12px",
                      }}
                    >
                      Lưu cấu hình
                    </Button>
                  </div>
                </motion.div>
              )}

              {record.fieldType === "Select" && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: "100%" }}
                >
                  <div style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        fontWeight: "500",
                        marginBottom: "4px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={(e) => {
                        const textareaWrapper =
                          e.currentTarget.nextElementSibling;
                        if (textareaWrapper) {
                          const textarea =
                            textareaWrapper.querySelector(".ant-input");
                          if (textarea) {
                            textarea.focus();
                          }
                        }
                      }}
                    >
                      {isTemplatePattern(record.formula) ? (
                        "Danh sách lựa chọn (mỗi dòng 1 lựa chọn):"
                      ) : (
                        <>
                          Danh sách lựa chọn (mỗi dòng 1 lựa chọn):
                          <div style={{ fontSize: "12px", color: "#1890ff", marginTop: "4px" }}>
                            Giá trị hiện tại sẽ được hiển thị trong input. Bạn có thể chỉnh sửa nếu cần.
                          </div>
                        </>
                      )}
                    </div>
                    <Form.Item
                      name={`options_${record.formFieldId}`}
                      style={{ marginBottom: "8px" }}
                    >
                      <TextArea
                        rows={4}
                        placeholder="Nhập mỗi lựa chọn trên một dòng"
                      />
                    </Form.Item>
                    <div style={{ marginTop: "16px" }}>
                      <Form.Item
                        name={`isRequired_${record.formFieldId}`}
                        valuePropName="checked"
                        style={{ marginBottom: "12px" }}
                      >
                        <Checkbox>Bắt buộc nhập</Checkbox>
                      </Form.Item>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleSaveConfig(record)}
                        style={{
                          height: "28px",
                          fontSize: "12px",
                          padding: "4px 12px",
                        }}
                      >
                        Lưu cấu hình
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {record.fieldType === "Formula" && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: "100%" }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        fontWeight: "500",
                        marginBottom: "4px",
                        display: "block",
                      }}
                    >
                      Công thức:
                    </label>
                    <Form.Item
                      name={`formula_${record.formFieldId}`}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="Nhập công thức"
                        onChange={(e) => {
                          setConfigChanges((prev) => ({
                            ...prev,
                            [record.formFieldId]: true,
                          }));
                        }}
                      />
                    </Form.Item>
                    <div style={{ marginTop: "4px", color: "#666" }}>
                      <InfoCircleOutlined style={{ marginRight: "4px" }} />
                      Ví dụ các biến có thể dùng: {getRandomFieldsExample(record)}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Chỉ hiển thị checkbox và nút lưu cho fields không phải Boolean và không phải Select */}
              {record.fieldType !== "Boolean" && record.fieldType !== "Select" && (
                <>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Form.Item
                      name={`isRequired_${record.formFieldId}`}
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox>Bắt buộc nhập</Checkbox>
                    </Form.Item>
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleSaveConfig(record)}
                    >
                      Lưu cấu hình
                    </Button>
                  </motion.div>
                </>
              )}
            </Space>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const leftColumns = [
    {
      title: "Tên biến",
      dataIndex: "fieldName",
      key: "fieldName",
      width: "60%",
    },
    {
      title: "",
      dataIndex: "fieldType",
      key: "fieldType",
      width: "40%",
      render: (type) => getFieldTypeTag(type),
    },
  ];

  const rightColumns = [
    {
      title: "STT",
      dataIndex: "index",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
      align: "left",
    },
    {
      title: "Tên biến",
      dataIndex: "fieldName",
      key: "fieldName",
      width: "30%",
    },
    {
      title: "Loại",
      dataIndex: "fieldType",
      key: "fieldType",
      width: "20%",
      render: (type) => getFieldTypeTag(type),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (_, record) => {
        let description = "";
        if (record.fieldType?.toLowerCase() === "boolean") {
          description = "Lựa chọn (Có/Không)";
        } else if (record.fieldType?.toLowerCase() === "number") {
          description = "Nhập số";
        } else if (record.fieldType?.toLowerCase() === "date") {
          description = "Ngày tháng";
        } else if (record.fieldType?.toLowerCase() === "formula") {
          description = "Tính toán tự động";
        } else if (record.fieldType?.toLowerCase() === "select") {
          description = "Chọn từ danh sách (Bắt buộc)";
        } else {
          description = "Văn bản tự do";
        }
        return `${description} ${record.isRequired ? "(Bắt buộc)" : ""}`;
      },
    },
  ];

  // Kiểm tra quyền admin
  if (user?.roleName !== "admin") {
    return (
      <AppLayout>
        <div style={{ padding: "24px" }}>
          <Result
            status="403"
            title="403"
            subTitle="Xin lỗi, bạn không có quyền truy cập trang này. Chỉ quản trị viên mới có thể cấu hình form."
            extra={
              <Button type="primary" onClick={() => navigate("/")}>
                Về trang chủ
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Form form={form} layout="vertical">
        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: "24px" }}>
            <Title level={3} style={{ margin: 0 }}>
              Danh mục: {formData?.formName}
            </Title>
          </div>

          <Row gutter={16}>
            <Col span={10}>
              <Card
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Danh sách biến ({fields.length})</span>
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={handleSaveAllConfigs}
                      loading={loading}
                    >
                      Lưu tất cả
                    </Button>
                  </div>
                }
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  columns={leftColumns}
                  dataSource={fields}
                  rowKey="formFieldId"
                  pagination={false}
                  size="small"
                  loading={loading}
                  expandable={{
                    expandedRowRender,
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
                      setExpandedRowKeys(expanded ? [record.formFieldId] : []);
                    },
                    expandIcon: ({ expanded, onExpand, record }) =>
                      expanded ? (
                        <CaretDownOutlined
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpand(record, e);
                          }}
                          style={{
                            fontSize: "16px",
                            padding: "4px",
                            color: "#1890ff",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        />
                      ) : (
                        <CaretRightOutlined
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpand(record, e);
                          }}
                          style={{
                            fontSize: "16px",
                            padding: "4px",
                            color: "#1890ff",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        />
                      ),
                    rowExpandable: () => true,
                    expandRowByClick: true,
                  }}
                  onRow={(record) => ({
                    onClick: (e) => {
                      // Tránh trigger khi click vào expand icon
                      if (e.target.closest(".anticon")) return;

                      const isExpanded = expandedRowKeys.includes(
                        record.formFieldId
                      );
                      setExpandedRowKeys(
                        isExpanded ? [] : [record.formFieldId]
                      );
                    },
                    style: {
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    },
                  })}
                  scroll={{ y: "calc(100vh - 250px)" }}
                  style={{ height: "calc(100vh - 200px)" }}
                />
              </Card>
            </Col>
            <Col span={14}>
              <Card
                title={
                  <div className="preview-header">
                    Xem trước form và các biến
                  </div>
                }
                className="preview-table"
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  columns={rightColumns}
                  dataSource={fields}
                  rowKey="formFieldId"
                  pagination={false}
                  size="small"
                  loading={loading}
                  scroll={{ y: "calc(100vh - 250px)" }}
                  className="preview-table-content"
                />
              </Card>
            </Col>
          </Row>

          {/* Action buttons at bottom */}
          <div
            style={{
              marginTop: "24px",
              textAlign: "center",
              padding: "20px",
              backgroundColor: "#fafafa",
              borderRadius: "8px",
              border: "1px solid #d9d9d9",
            }}
          >
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/preview-form/${formId}`)}
                style={{
                  height: "40px",
                  fontSize: "14px",
                  padding: "0 24px",
                  backgroundColor: "#52c41a",
                  borderColor: "#52c41a",
                }}
              >
                Xem trước form
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/manage-form")}
                style={{
                  height: "40px",
                  fontSize: "14px",
                  padding: "0 24px",
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                Hoàn thành cấu hình biến
              </Button>
              <Button
                size="large"
                icon={<UnorderedListOutlined />}
                onClick={() => navigate("/manage-form")}
                style={{
                  height: "40px",
                  fontSize: "14px",
                  padding: "0 24px",
                }}
              >
                Quay lại danh sách
              </Button>
            </Space>
          </div>
        </div>
      </Form>
    </AppLayout>
  );
};

export default FormConfigPage;
