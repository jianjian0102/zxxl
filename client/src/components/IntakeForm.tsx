import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Loader2, Upload, X, CheckCircle2 } from "lucide-react";

const concernTopics = [
  "自我探索",
  "职业发展",
  "情绪调节",
  "人际关系",
  "环境适应",
  "提升自信",
  "抑郁/焦虑",
  "价值感/意义感",
  "其他",
] as const;

const createIntakeFormSchema = (isWelfare: boolean) => {
  const baseSchema = z.object({
    name: z.string().min(2, "请输入姓名"),
    gender: z.enum(["male", "female", "other"], { required_error: "请选择性别" }),
    birthDate: z.string().min(1, "请输入出生日期"),
    occupation: z.string().min(1, "请输入职业"),
    hobbies: z.string().optional(),
    previousCounseling: z.enum(["yes", "no"], { required_error: "请选择" }),
    diagnosedCondition: z.enum(["yes", "no"], { required_error: "请选择" }),
    currentMedication: z.string().optional(),
    concernTopics: z.array(z.string()).min(1, "请至少选择一个关心主题"),
    detailedDescription: z.string().min(20, "请详细说明您的情况（至少20字）"),
    contactEmail: z.string().email("请输入有效的邮箱地址"),
    contactPhone: z.string().optional(),
    dataCollectionConsent: z.boolean().refine((val) => val === true, "请同意信息收集条款"),
    confidentialityConsent: z.boolean().refine((val) => val === true, "请同意保密协议"),
    welfareProofFile: z.string().optional(),
  });

  if (isWelfare) {
    return baseSchema.extend({
      welfareProofFile: z.string().min(1, "请上传证明材料"),
    });
  }

  return baseSchema;
};

type IntakeFormValues = z.infer<ReturnType<typeof createIntakeFormSchema>>;

interface IntakeFormProps {
  consultationType: "regular" | "welfare";
  consultationMode: "online" | "offline";
  onSubmit: (data: IntakeFormValues & { consultationMode: string }) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function IntakeForm({ 
  consultationType, 
  consultationMode,
  onSubmit, 
  onBack, 
  isSubmitting = false 
}: IntakeFormProps) {
  const isWelfare = consultationType === "welfare";
  const intakeFormSchema = createIntakeFormSchema(isWelfare);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      name: "",
      birthDate: "",
      occupation: "",
      hobbies: "",
      currentMedication: "",
      concernTopics: [],
      detailedDescription: "",
      contactEmail: "",
      contactPhone: "",
      dataCollectionConsent: false,
      confidentialityConsent: false,
      welfareProofFile: "",
    },
  });

  const handleSubmit = (data: IntakeFormValues) => {
    onSubmit({ ...data, consultationMode });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      form.setError("welfareProofFile", { message: "文件大小不能超过10MB" });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      form.setError("welfareProofFile", { message: "只支持 JPG、PNG、GIF 或 PDF 格式" });
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');
      
      const { uploadUrl, fileKey } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      form.setValue("welfareProofFile", fileKey);
      setUploadedFileName(file.name);
      form.clearErrors("welfareProofFile");
    } catch (error) {
      console.error('Upload error:', error);
      form.setError("welfareProofFile", { message: "上传失败，请重试" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    form.setValue("welfareProofFile", "");
    setUploadedFileName(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>心理咨询申请表</CardTitle>
        <CardDescription>
          请如实填写以下信息，帮助咨询师更好地了解您的情况
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-medium border-b pb-2">基本信息</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的姓名" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性别 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="请选择性别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">男</SelectItem>
                          <SelectItem value="female">女</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出生日期 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-birthdate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职业 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入您的职业" {...field} data-testid="input-occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hobbies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>兴趣爱好</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入您的兴趣爱好（选填）" {...field} data-testid="input-hobbies" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">咨询方式：</span>
                  <span className="font-medium">
                    {consultationMode === "online" ? "线上咨询" : "线下咨询"}
                  </span>
                  {isWelfare && (
                    <span className="text-xs text-muted-foreground">（公益咨询仅支持线上）</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium border-b pb-2">咨询背景</h3>

              <FormField
                control={form.control}
                name="previousCounseling"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>过去是否有过心理咨询的经历？ *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="prev-yes" data-testid="radio-prev-yes" />
                          <Label htmlFor="prev-yes">是</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="prev-no" data-testid="radio-prev-no" />
                          <Label htmlFor="prev-no">否</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diagnosedCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>是否确诊过心理疾病？ *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="diag-yes" data-testid="radio-diag-yes" />
                          <Label htmlFor="diag-yes">是</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="diag-no" data-testid="radio-diag-no" />
                          <Label htmlFor="diag-no">否</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentMedication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>是否有在服用的药物？</FormLabel>
                    <FormControl>
                      <Input placeholder="如有，请说明药物名称（选填）" {...field} data-testid="input-medication" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium border-b pb-2">咨询需求</h3>

              <FormField
                control={form.control}
                name="concernTopics"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>此次心理咨询的关心主题（可多选）*</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {concernTopics.map((topic) => (
                        <div key={topic} className="flex items-center space-x-2">
                          <Checkbox
                            id={topic}
                            checked={field.value?.includes(topic)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...(field.value || []), topic]
                                : field.value?.filter((t) => t !== topic) || [];
                              field.onChange(newValue);
                            }}
                            data-testid={`checkbox-${topic}`}
                          />
                          <Label htmlFor={topic} className="text-sm cursor-pointer">
                            {topic}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detailedDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>请详细说明您的情况 *</FormLabel>
                    <FormDescription>
                      结合上一题选择的主题，详细描述您希望咨询的内容
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="请描述您当前的困扰、期望通过咨询获得的帮助等..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isWelfare && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium border-b pb-2">公益咨询资格证明</h3>

                <FormField
                  control={form.control}
                  name="welfareProofFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>上传证明材料 *</FormLabel>
                      <FormDescription>
                        请上传学生证、低保证明或其他经济困难相关证明（支持 JPG、PNG、GIF、PDF，最大10MB）
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-3">
                          {!uploadedFileName ? (
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,application/pdf"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                data-testid="input-welfare-proof"
                              />
                              <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">上传中...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">点击或拖拽文件到此处上传</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="text-sm">{uploadedFileName}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleRemoveFile}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <input type="hidden" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-lg font-medium border-b pb-2">联系方式</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱地址 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入邮箱地址" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号码</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入手机号码（选填）" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">协议确认</h3>

              <FormField
                control={form.control}
                name="dataCollectionConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-data-consent"
                      />
                    </FormControl>
                    <div className="flex items-center gap-1 leading-none">
                      <FormLabel className="cursor-pointer font-normal">
                        我同意咨询师收集上述信息用于咨询服务 *
                      </FormLabel>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto px-1 py-0 text-primary">
                            <FileText className="mr-1 h-3 w-3" />
                            查看详情
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>信息收集说明</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh]">
                            <div className="text-sm text-muted-foreground space-y-3 pr-4">
                              <p>您提供的个人信息将仅用于以下目的：</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>预约咨询服务的安排与管理</li>
                                <li>帮助咨询师了解您的基本情况和咨询需求</li>
                                <li>咨询过程中的沟通联络</li>
                                <li>咨询记录的保存（如法律法规要求）</li>
                              </ul>
                              <p>您的信息将被严格保密，不会向任何第三方披露，除非：</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>获得您的明确授权</li>
                                <li>法律法规要求</li>
                                <li>存在危及您或他人生命安全的紧急情况</li>
                              </ul>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidentialityConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-confidentiality"
                      />
                    </FormControl>
                    <div className="flex items-center gap-1 leading-none">
                      <FormLabel className="cursor-pointer font-normal">
                        我已阅读并同意保密协议 *
                      </FormLabel>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto px-1 py-0 text-primary">
                            <Shield className="mr-1 h-3 w-3" />
                            查看保密协议
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>心理咨询保密协议（简约版）</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[60vh]">
                            <div className="text-sm text-muted-foreground space-y-3 pr-4">
                              <p><strong>一、保密原则</strong></p>
                              <p>咨询师将对咨询过程中获得的所有信息严格保密，包括但不限于来访者的个人身份信息、咨询内容、心理评估结果等。</p>
                              
                              <p><strong>二、保密例外</strong></p>
                              <p>在以下情况下，咨询师有权或有义务打破保密原则：</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>来访者有伤害自己或他人的紧迫危险</li>
                                <li>来访者涉及虐待儿童、老人或残障人士</li>
                                <li>法律程序要求咨询师提供信息</li>
                                <li>来访者明确书面授权咨询师披露信息</li>
                              </ul>
                              
                              <p><strong>三、咨询记录</strong></p>
                              <p>咨询师将保留必要的咨询记录，这些记录将被安全保存，未经授权不会向任何第三方披露。</p>
                              
                              <p><strong>四、督导与培训</strong></p>
                              <p>咨询师可能会在专业督导或培训中匿名讨论案例，但会隐去所有可识别来访者身份的信息。</p>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} data-testid="button-back">
                返回修改时间
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting} data-testid="button-submit-form">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "提交中..." : "提交预约申请"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
